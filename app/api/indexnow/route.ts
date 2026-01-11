import { NextRequest, NextResponse } from 'next/server'

const INDEXNOW_KEY = '1e97bff8b6d849d981ef3781448b3cb9'
const KEY_LOCATION = 'https://greenchainz.com/1e97bff8b6d849d981ef3781448b3cb9.txt'

export async function POST(request: NextRequest) {
  try {
    const { urls } = await request.json()

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: 'URLs array required' },
        { status: 400 }
      )
    }

    // Limit to 10,000 URLs
    const urlList = urls.slice(0, 10000)

    const payload = {
      host: 'greenchainz.com',
      key: INDEXNOW_KEY,
      keyLocation: KEY_LOCATION,
      urlList: urlList,
    }

    // Submit to IndexNow API (notifies Bing, Yandex, Naver, Seznam)
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    })

    const statusCode = response.status

    if (statusCode === 200) {
      return NextResponse.json({
        success: true,
        submitted: urlList.length,
        message: 'URLs submitted successfully to search engines',
      })
    } else if (statusCode === 202) {
      return NextResponse.json({
        success: true,
        submitted: urlList.length,
        message: 'URLs received. Key validation pending.',
      })
    } else {
      const errorText = await response.text()
      return NextResponse.json(
        { 
          error: `IndexNow error: ${statusCode}`,
          details: errorText 
        },
        { status: statusCode }
      )
    }
  } catch (error) {
    console.error('IndexNow submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit URLs' },
      { status: 500 }
    )
  }
}

// Optional: GET endpoint to test
export async function GET() {
  return NextResponse.json({
    message: 'IndexNow API ready',
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
  })
}
