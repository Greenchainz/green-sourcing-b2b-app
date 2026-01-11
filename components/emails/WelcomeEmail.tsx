import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";
import * as React from "react";

interface WelcomeEmailProps {
  firstName: string;
  loginUrl?: string;
}

export const WelcomeEmail = ({
  firstName,
  loginUrl = "https://greenchainz.com/login",
}: WelcomeEmailProps) => {
  const previewText = `Welcome to GreenChainz, ${firstName}!`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
            <Section className="mt-[32px]">
              <Img
                src="https://greenchainz.com/static/logo.png"
                width="150"
                height="50"
                alt="GreenChainz"
                className="my-0 mx-auto"
              />
            </Section>
            <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
              Welcome to <strong>GreenChainz</strong>
            </Heading>
            <Text className="text-black text-[14px] leading-[24px]">
              Hello {firstName},
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              We're excited to have you on board. GreenChainz is the B2B
              marketplace dedicated to verified green sourcing.
            </Text>
            <Section className="text-center mt-[32px] mb-[32px]">
              <Button
                className="bg-[#2d6a4f] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                href={loginUrl}
              >
                Get Started
              </Button>
            </Section>
            <Text className="text-black text-[14px] leading-[24px]">
              or copy and paste this URL into your browser:{" "}
              <Link href={loginUrl} className="text-blue-600 no-underline">
                {loginUrl}
              </Link>
            </Text>
            <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
            <Text className="text-[#666666] text-[12px] leading-[24px]">
              If you didn't request this email, you can safely ignore it.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default WelcomeEmail;
