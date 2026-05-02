import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Copy, Check, ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { FounderVideoRecorder } from "@/components/FounderVideoRecorder";

export default function FounderVideoNew() {
  const [, navigate] = useLocation();

  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [subject, setSubject] = useState("");
  const [note, setNote] = useState("");
  const [sendEmail, setSendEmail] = useState(true);

  const [isUploading, setIsUploading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createMutation = trpc.founderVideo.create.useMutation();
  const finalizeMutation = trpc.founderVideo.finalize.useMutation();

  const formValid =
    recipientEmail.trim().length > 0 &&
    recipientName.trim().length > 0 &&
    subject.trim().length > 0;

  async function handleSend(blob: Blob, durationSec: number): Promise<void> {
    if (!formValid) {
      toast.error("Fill in recipient email, name, and subject first");
      return;
    }

    setIsUploading(true);
    try {
      const created = await createMutation.mutateAsync({
        recipientEmail: recipientEmail.trim(),
        recipientName: recipientName.trim(),
        subject: subject.trim(),
        note: note.trim() || undefined,
      });

      const putRes = await fetch(created.uploadUrl, {
        method: "PUT",
        headers: {
          "x-ms-blob-type": "BlockBlob",
          "Content-Type": "video/webm",
        },
        body: blob,
      });

      if (!putRes.ok) {
        const txt = await putRes.text().catch(() => "");
        throw new Error(`Upload failed (${putRes.status}): ${txt.slice(0, 200)}`);
      }

      const finalized = await finalizeMutation.mutateAsync({
        videoId: created.videoId,
        durationSec,
        sendEmail,
      });

      setShareUrl(finalized.shareUrl);
      toast.success(sendEmail ? "Video sent + email delivered" : "Video ready — copy the link below");
    } catch (err) {
      console.error("[founder-video-new] send failed:", err);
      toast.error(err instanceof Error ? err.message : "Failed to send video");
      throw err;
    } finally {
      setIsUploading(false);
    }
  }

  function copyLink(): void {
    if (!shareUrl) return;
    void navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4">
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin/founder-videos")} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to videos
      </Button>

      <h1 className="text-2xl font-bold mb-1">New Founder Video</h1>
      <p className="text-muted-foreground mb-6">
        Record a 60-second personalized video. Recipient gets a share link by email.
      </p>

      {shareUrl ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              Video sent
            </CardTitle>
            <CardDescription>
              {sendEmail ? `${recipientEmail} got the share link in their inbox.` : "Copy the link and send it however you'd like."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly className="font-mono text-sm" />
              <Button onClick={copyLink} variant="outline">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => navigate("/admin/founder-videos")}>View all sent videos</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShareUrl(null);
                  setRecipientEmail("");
                  setRecipientName("");
                  setSubject("");
                  setNote("");
                }}
              >
                Send another
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recipient</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="recipientName">Name</Label>
                  <Input
                    id="recipientName"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Mike Johnson"
                    disabled={isUploading}
                  />
                </div>
                <div>
                  <Label htmlFor="recipientEmail">Email</Label>
                  <Input
                    id="recipientEmail"
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="mike@suppliercorp.com"
                    disabled={isUploading}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Quick intro — GreenChainz"
                  disabled={isUploading}
                />
              </div>

              <div>
                <Label htmlFor="note">Note (optional)</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Shown next to the video on the watch page."
                  rows={3}
                  disabled={isUploading}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  disabled={isUploading}
                  className="h-4 w-4"
                />
                <span className="text-sm flex items-center gap-1.5">
                  <Mail className="w-4 h-4" />
                  Email the share link to the recipient automatically
                </span>
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Record your video</CardTitle>
              <CardDescription>60-second hard limit. You can re-record before sending.</CardDescription>
            </CardHeader>
            <CardContent>
              <FounderVideoRecorder onSend={handleSend} isSending={isUploading} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
