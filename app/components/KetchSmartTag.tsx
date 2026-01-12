'use client'

import Script from 'next/script'

/**
 * KetchSmartTag - GDPR-compliant consent management with authentication cookie exemptions
 * 
 * This component loads the Ketch Smart Tag and configures authentication cookies
 * as "strictly necessary" under GDPR Article 6(1)(b) and the ePrivacy Directive.
 * 
 * Authentication cookies are exempt from consent requirements because they are:
 * - Essential for providing the login service the user explicitly requested
 * - Not used for tracking or profiling
 * - Required for security purposes (CSRF protection)
 * 
 * @see https://gdpr.eu/cookies/ - EU guidance on cookie consent
 */
export default function KetchSmartTag() {
  const ketchOrgCode = process.env.NEXT_PUBLIC_KETCH_ORG_CODE

  if (!ketchOrgCode) {
    return null
  }

  const ketchBootUrl = `https://global.ketchcdn.com/web/v3/config/${ketchOrgCode}/website_smart_tag/boot.js`

  return (
    <>
      <Script id="ketch-smart-tag" strategy="afterInteractive">
        {`
          !function(){
            window.semaphore = window.semaphore || [];
            window.ketch = function(){ window.semaphore.push(arguments); };
            
            // GDPR-Compliant: Exempt authentication cookies as "strictly necessary"
            // These cookies are essential for login functionality and are exempt from
            // consent under GDPR Article 6(1)(b) and the ePrivacy Directive.
            ketch('on', 'consent', function() {
              ketch('setConfig', {
                exemptCookies: [
                  'next-auth.session-token',
                  'next-auth.state',
                  'next-auth.callback-url',
                  'next-auth.csrf-token',
                  '__Secure-next-auth.session-token',
                  '__Secure-next-auth.state',
                  '__Secure-next-auth.callback-url',
                  '__Host-next-auth.csrf-token'
                ]
              });
            });
            
            // Load Ketch Smart Tag
            var e = document.createElement("script");
            e.type = "text/javascript";
            e.src = "${ketchBootUrl}";
            e.defer = e.async = !0;
            document.getElementsByTagName("head")[0].appendChild(e);
          }();
        `}
      </Script>
    </>
  )
}
