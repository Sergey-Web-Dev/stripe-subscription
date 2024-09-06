import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DbService } from '../db/db.service';

@Injectable()
export class UserService {
  constructor(private db: DbService) {}

  async createUser(data: Prisma.UserCreateInput) {
    return this.db.user.create({ data });
  }

  async getUserByEmail(email: string) {
    return this.db.user.findUnique({ where: { email } });
  }
}
