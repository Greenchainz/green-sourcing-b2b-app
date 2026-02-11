#!/bin/bash

# Array of pages with titles and descriptions
declare -A pages=(
  ["about"]="About Us|Learn about GreenChainz's mission to make sustainable sourcing simple and accessible."
  ["blog"]="Blog|Stay updated with the latest insights on sustainable construction and green building materials."
  ["careers"]="Careers|Join our team and help build the future of sustainable construction."
  ["contact"]="Contact Us|Get in touch with our team. We're here to help with your sustainability needs."
  ["how-it-works"]="How It Works|Discover how GreenChainz makes sustainable material sourcing effortless."
  ["pricing"]="Pricing|Flexible plans for teams of all sizes. Start free, upgrade as you grow."
  ["help-center"]="Help Center|Find answers to common questions and learn how to get the most out of GreenChainz."
  ["api-docs"]="API Documentation|Integrate GreenChainz data into your applications with our developer-friendly API."
  ["partner-program"]="Partner Program|Join our network of sustainable material suppliers and reach more customers."
  ["privacy"]="Privacy Policy|Your privacy matters. Learn how we protect and use your data."
  ["terms"]="Terms of Service|The legal terms governing your use of GreenChainz services."
  ["supplier-agreement"]="Supplier Agreement|Terms and conditions for suppliers joining the GreenChainz marketplace."
  ["signup"]="Sign Up|Create your free GreenChainz account and start sourcing sustainable materials today."
  ["dashboard"]="Dashboard|Your GreenChainz control center for managing projects and materials."
)

for page in "${!pages[@]}"; do
  IFS='|' read -r title description <<< "${pages[$page]}"
  cat > "app/$page/page.tsx" << EOPAGE
import PlaceholderPage from "../../components/PlaceholderPage";

export default function Page() {
  return <PlaceholderPage title="$title" description="$description" />;
}
EOPAGE
  echo "Created app/$page/page.tsx"
done
