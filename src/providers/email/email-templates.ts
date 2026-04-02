export const MFA_EMAIL_SUBJECT = 'Seu código de verificação';

export function mfaEmailHtml(code: string): string {
  return `<p>Seu código de verificação é: <strong>${code}</strong></p><p>Válido por 10 minutos.</p>`;
}

export const ABANDONMENT_EMAIL_SUBJECT = 'Continue seu cadastro';

export function abandonmentEmailHtml(
  registrationId: string,
  frontendUrl: string,
): string {
  const link = `${frontendUrl}/register?id=${registrationId}`;
  return `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
  <h2 style="color:#0e1612;">Você não terminou seu cadastro</h2>
  <p>Você iniciou um cadastro mas não concluiu. Clique no botão abaixo para continuar de onde parou:</p>
  <a href="${link}"
     style="display:inline-block;padding:12px 24px;background:#45a874;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;">
    Continuar cadastro
  </a>
  <p style="color:#888;font-size:12px;margin-top:24px;">Se você não iniciou este cadastro, ignore este e-mail.</p>
</div>`.trim();
}
