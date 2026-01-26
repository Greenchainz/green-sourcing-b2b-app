// app/components/CommunicationWidget.tsx
import { ChatComposite } from "@azure/communication-react";

export function SupportChat() {
  return (
    <ChatComposite
      userId={session.user.id}
      token={commServicesToken}
      displayName={session.user.email}
    />
  );
}
