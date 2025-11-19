"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockEmailService = void 0;
class MockEmailService {
    async send(to, subject, body) {
        console.log(' [MOCK] Email enviado para:', to);
        console.log('   Assunto:', subject);
        console.log('   Corpo:', body.substring(0, 100) + '...');
    }
    async sendWithAttachments(to, subject, body, attachments) {
        console.log(' [MOCK] Email com anexos enviado para:', to);
        console.log('   Assunto:', subject);
        console.log('   Anexos:', attachments.map(a => a.filename).join(', '));
    }
}
exports.MockEmailService = MockEmailService;
