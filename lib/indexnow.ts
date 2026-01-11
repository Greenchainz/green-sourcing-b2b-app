/**
 * Submit URLs to IndexNow for instant indexing on Bing, Yandex, Naver, Seznam
 */
export async function submitToIndexNow(urls: string | string[]) {
  // Convert single URL to array
  const urlList = Array.isArray(urls) ? urls : [urls]
  
  // Skip in development
  if (process.env.NODE_ENV !== 'production') {
    console.log('IndexNow skipped (dev mode):', urlList)
    return { success: true, dev: true }
  }

  try {
    const response = await fetch('https://greenchainz.com/api/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: urlList }),
    })

    const result = await response.json()
    
    if (response.ok) {
      console.log(`✅ IndexNow: ${urlList.length} URLs submitted`)
      return result
    } else {
      console.error('❌ IndexNow failed:', result)
      return { success: false, error: result }
    }
  } catch (error) {
    console.error('❌ IndexNow error:', error)
    return { success: false, error }
  }
}
