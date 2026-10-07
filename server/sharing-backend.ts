import { randomUUID } from 'node:crypto';
import { SharingService } from '../application/sharing-service';
import { createOwnerStore } from './owner-backend';
let service: Promise<SharingService> | undefined;
export function getSharingService() {
 return service ??= createOwnerStore(process.env).then(store => new SharingService(store, randomUUID)).catch(error => { service = undefined; throw error; });
}
