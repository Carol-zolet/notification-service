import "dotenv/config";
import { NodemailerService } from "./src/infra/services/nodemailer.service";

async function main() {
  const emailService = new NodemailerService();
  try {
    await emailService.send(
      "carolinezolet@gmail.com",
      "Teste Brevo direto",
      "Este é um teste de envio direto pelo serviço Nodemailer/Brevo."
    );
    console.log("✅ E-mail enviado com sucesso!");
  } catch (err) {
    console.error("❌ Falha ao enviar e-mail:", err);
  }
}

main();
