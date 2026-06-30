// OCR service using Claude API — extrage indexul din poza unui contor

export async function extractIndexFromImage(imageBase64, mimeType = 'image/jpeg') {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: imageBase64 }
            },
            {
              type: 'text',
              text: `Aceasta este o fotografie a unui contor (electric, apă sau gaze). 
Extrage DOAR numărul afișat pe contor (indexul curent).
Răspunde EXCLUSIV cu numărul, fără unități, fără text suplimentar.
Exemplu de răspuns corect: 1242 sau 45.3
Dacă nu poți determina numărul cu certitudine, răspunde: NECLAR`
            }
          ]
        }]
      })
    })

    if (!response.ok) throw new Error(`API error: ${response.status}`)
    const data = await response.json()
    const text = data.content?.[0]?.text?.trim() || 'NECLAR'

    if (text === 'NECLAR') return { success: false, value: null, raw: text }

    // Extrage numărul — acceptă și virgulă ca separator decimal
    const cleaned = text.replace(',', '.').replace(/[^0-9.]/g, '')
    const num = parseFloat(cleaned)
    if (isNaN(num)) return { success: false, value: null, raw: text }

    return { success: true, value: num, raw: text }
  } catch (err) {
    return { success: false, value: null, error: err.message }
  }
}

// Convertește File/Blob în base64
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
