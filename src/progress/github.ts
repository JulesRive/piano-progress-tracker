import { normalizeProgress, type ProgressFile } from './model.ts'

const REPO = 'JulesRive/piano-progress-tracker'
const FILE_PATH = 'public/progress.json'

function headers(token: string): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

export function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export function decodeBase64(value: string): string {
  const binary = atob(value.replace(/\s/g, ''))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string }
    if (response.status === 409) {
      return 'GitHub has a newer progress.json. Load from GitHub, then save again.'
    }
    if (response.status === 401) return 'GitHub rejected the token. Check that it is still valid.'
    if (response.status === 403 || response.status === 404) {
      return body.message
        ? `${body.message} The token needs Contents read and write on ${REPO}.`
        : `GitHub error ${response.status}. The token needs Contents read and write on ${REPO}.`
    }
    return body.message ?? `GitHub error ${response.status}`
  } catch {
    return `GitHub error ${response.status}`
  }
}

export async function fetchProgressFromGitHub(token: string): Promise<ProgressFile> {
  const response = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}?ref=main`, {
    headers: headers(token),
  })
  if (!response.ok) throw new Error(await errorMessage(response))
  const body = (await response.json()) as { content?: string }
  if (!body.content) throw new Error('GitHub did not return progress.json')
  return normalizeProgress(JSON.parse(decodeBase64(body.content)))
}

export async function saveProgressToGitHub(token: string, progress: ProgressFile): Promise<void> {
  const existing = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}?ref=main`, {
    headers: headers(token),
  })
  let sha: string | undefined
  if (existing.ok) {
    const body = (await existing.json()) as { sha?: string }
    sha = body.sha
  } else if (existing.status !== 404) {
    throw new Error(await errorMessage(existing))
  }
  const content = encodeBase64(`${JSON.stringify(progress, null, 2)}\n`)
  const response = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`, {
    method: 'PUT',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Update practice progress',
      content,
      sha,
      branch: 'main',
    }),
  })
  if (!response.ok) throw new Error(await errorMessage(response))
}
