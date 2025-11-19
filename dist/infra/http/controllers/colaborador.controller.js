"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ColaboradorController = void 0;
class ColaboradorController {
    createUC;
    deleteUC;
    getByFilialUC;
    getAllFiliaisUC;
    updateUC;
    getByIdUC;
    getAllUC;
    constructor(createUC, deleteUC, getByFilialUC, getAllFiliaisUC, updateUC, getByIdUC, getAllUC) {
        this.createUC = createUC;
        this.deleteUC = deleteUC;
        this.getByFilialUC = getByFilialUC;
        this.getAllFiliaisUC = getAllFiliaisUC;
        this.updateUC = updateUC;
        this.getByIdUC = getByIdUC;
        this.getAllUC = getAllUC;
    }
    handleCreate = async (req, res) => {
        try {
            const colaborador = await this.createUC.execute(req.body);
            res.status(201).json(colaborador);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    };
    handleGetAll = async (req, res) => {
        try {
            const { filial } = req.query;
            let colaboradores;
            if (filial) {
                colaboradores = await this.getByFilialUC.execute(filial);
            }
            else {
                colaboradores = await this.getAllUC.execute();
            }
            res.status(200).json(colaboradores);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    };
    handleGetById = async (req, res) => {
        try {
            const { id } = req.params;
            const colaborador = await this.getByIdUC.execute(id);
            if (!colaborador) {
                return res.status(404).json({ error: 'Colaborador não encontrado' });
            }
            res.status(200).json(colaborador);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    };
    handleUpdate = async (req, res) => {
        try {
            const { id } = req.params;
            const colaborador = await this.updateUC.execute(id, req.body);
            res.status(200).json(colaborador);
        }
        catch (error) {
            res.status(404).json({ error: 'Colaborador não encontrado' });
        }
    };
    handleDelete = async (req, res) => {
        try {
            const { id } = req.params;
            await this.deleteUC.execute(id);
            res.status(204).send();
        }
        catch (error) {
            res.status(404).json({ error: 'Colaborador não encontrado' });
        }
    };
    handleGetAllFiliais = async (req, res) => {
        try {
            const filiais = await this.getAllFiliaisUC.execute();
            res.status(200).json(filiais);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    };
}
exports.ColaboradorController = ColaboradorController;
