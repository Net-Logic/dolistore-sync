export function maskSecrets(message, secrets) {
  let out = String(message)
  for (const secret of secrets) {
    if (secret) {
      out = out.split(secret).join('***')
    }
  }
  return out
}
