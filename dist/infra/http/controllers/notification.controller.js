"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
class NotificationController {
    scheduleUseCase;
    sendDueUseCase;
    constructor(scheduleUseCase, sendDueUseCase) {
        this.scheduleUseCase = scheduleUseCase;
        this.sendDueUseCase = sendDueUseCase;
    }
    schedule = async (req, res) => {
        try {
            const notification = await this.scheduleUseCase.execute(req.body);
            return res.status(201).json(notification);
        }
        catch (error) {
            console.error('[NotificationController] Erro ao agendar:', error);
            return res.status(400).json({ error: error.message });
        }
    };
    sendDueNow = async (req, res) => {
        try {
            const result = await this.sendDueUseCase.execute();
            return res.status(200).json(result);
        }
        catch (error) {
            console.error('[NotificationController] Erro ao enviar:', error);
            return res.status(500).json({ error: error.message });
        }
    };
}
exports.NotificationController = NotificationController;
