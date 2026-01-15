import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";
import * as React from "react";

interface RFQNotificationEmailProps {
  supplierName: string;
  projectName: string;
  materialName: string;
  quantity: string;
  rfqLink?: string;
}

export const RFQNotificationEmail = ({
  supplierName,
  projectName,
  materialName,
  quantity,
  rfqLink = "https://greenchainz.com/dashboard/rfqs",
}: RFQNotificationEmailProps) => {
  const previewText = `New RFQ for ${projectName}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
            <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
              New RFQ Received
            </Heading>
            <Text className="text-black text-[14px] leading-[24px]">
              Hello {supplierName},
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              You have received a new Request for Quote (RFQ) for the project: <strong>{projectName}</strong>.
            </Text>
            <Section className="bg-[#f7fafc] p-[20px] rounded my-[20px]">
                <Text className="m-0 text-[14px]"><strong>Material:</strong> {materialName}</Text>
                <Text className="m-0 text-[14px]"><strong>Quantity:</strong> {quantity}</Text>
            </Section>
            <Section className="text-center mt-[32px] mb-[32px]">
              <Button
                className="bg-[#2d6a4f] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                href={rfqLink}
              >
                View RFQ
              </Button>
            </Section>
            <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
            <Text className="text-[#666666] text-[12px] leading-[24px]">
              Please respond within 48 hours to maintain your response rate score.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default RFQNotificationEmail;
