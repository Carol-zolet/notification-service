import { NodemailerService } from '../src/infra/services/nodemailer.service';
require('dotenv').config();

async function testEmail() {
  console.log('🧪 Testando envio de email...');
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_FROM:', process.env.SMTP_FROM);
  
  const emailService = new NodemailerService();
  
  try {
    const result = await emailService.sendWithAttachments(
      'carolinezolet@gmail.com',
      'Teste de Holerite - 26fit',
      'Olá Caroline! Este é um teste do sistema de envio de holerites da 26fit. Se você recebeu este email, o sistema está funcionando corretamente! 🎉',
      []
    );
    
    console.log('✅ Email enviado com sucesso!', result);
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
  }
}

testEmail();
