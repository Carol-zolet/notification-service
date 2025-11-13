import { Request, Response } from 'express';
import { CreateColaboradorUseCase } from '../../../application/use-cases/create-colaborador.use-case';
import { DeleteColaboradorUseCase } from '../../../application/use-cases/delete-colaborador.use-case';
import { GetColaboradoresByFilialUseCase } from '../../../application/use-cases/get-colaboradores-by-filial.use-case';
import { GetAllFiliaisUseCase } from '../../../application/use-cases/get-all-filiais.use-case';
import { UpdateColaboradorUseCase } from '../../../application/use-cases/update-colaborador.use-case';
import { GetColaboradorByIdUseCase } from '../../../application/use-cases/get-colaborador-by-id.use-case';
import { GetAllColaboradoresUseCase } from '../../../application/use-cases/get-all-colaboradores.use-case';

export class ColaboradorController {
  constructor(
    private readonly createUC: CreateColaboradorUseCase,
    private readonly deleteUC: DeleteColaboradorUseCase,
    private readonly getByFilialUC: GetColaboradoresByFilialUseCase,
    private readonly getAllFiliaisUC: GetAllFiliaisUseCase,
    private readonly updateUC: UpdateColaboradorUseCase,
    private readonly getByIdUC: GetColaboradorByIdUseCase,
    private readonly getAllUC: GetAllColaboradoresUseCase
  ) {}

  handleCreate = async (req: Request, res: Response) => {
    try {
      const colaborador = await this.createUC.execute(req.body);
      res.status(201).json(colaborador);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  handleGetAll = async (req: Request, res: Response) => {
    try {
      const { filial } = req.query;
      let colaboradores;
      if (filial) {
        colaboradores = await this.getByFilialUC.execute(filial as string);
      } else {
        colaboradores = await this.getAllUC.execute();
      }
      res.status(200).json(colaboradores);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };
  
  handleGetById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const colaborador = await this.getByIdUC.execute(id);
      if (!colaborador) {
        return res.status(404).json({ error: 'Colaborador não encontrado' });
      }
      res.status(200).json(colaborador);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  handleUpdate = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const colaborador = await this.updateUC.execute(id, req.body);
      res.status(200).json(colaborador);
    } catch (error: any) {
      res.status(404).json({ error: 'Colaborador não encontrado' });
    }
  };

  handleDelete = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.deleteUC.execute(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(404).json({ error: 'Colaborador não encontrado' });
    }
  };
  
  handleGetAllFiliais = async (req: Request, res: Response) => {
    try {
      const filiais = await this.getAllFiliaisUC.execute();
      res.status(200).json(filiais);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };
}
