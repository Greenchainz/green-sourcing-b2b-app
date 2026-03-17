'use client'

import { useEffect } from 'react'
import Script from 'next/script'

export default function IntercomWidget() {
    const appId = process.env.NEXT_PUBLIC_INTERCOM_APP_ID

    useEffect(() => {
        if (!appId || typeof window === 'undefined') {
            return
        }

        const windowWithIntercom = window as Window & {
            Intercom?: (...args: unknown[]) => void
            intercomSettings?: Record<string, unknown>
        }

        windowWithIntercom.intercomSettings = {
            app_id: appId,
        }

        if (typeof windowWithIntercom.Intercom === 'function') {
            windowWithIntercom.Intercom('update', windowWithIntercom.intercomSettings)
        }
    }, [appId])

    if (!appId) {
        return null
    }

    return (
        <Script
            id="intercom-loader"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
                __html: `(function(){
  var w=window;
  var ic=w.Intercom;
  if(typeof ic==='function'){
    ic('reattach_activator');
    ic('update', w.intercomSettings);
  } else {
    var d=document;
    var i=function(){i.c(arguments)};
    i.q=[];
    i.c=function(args){i.q.push(args)};
    w.Intercom=i;
    var l=function(){
      var s=d.createElement('script');
      s.type='text/javascript';
      s.async=true;
      s.src='https://widget.intercom.io/widget/${appId}';
      var x=d.getElementsByTagName('script')[0];
      x.parentNode.insertBefore(s,x);
    };
    if(w.attachEvent){
      w.attachEvent('onload', l);
    } else {
      w.addEventListener('load', l, false);
    }
  }
})();`,
            }}
        />
    )
}
