// src/app/pipes/role-filter.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';
import { User } from '../models';

@Pipe({ name: 'roleFilter' })
export class RoleFilterPipe implements PipeTransform {
  transform(users: User[], role: string): number {
    if (!users) return 0;
    return users.filter(u => u.role === role).length;
  }
}
