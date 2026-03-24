import db from './db.js';

export async function logAudit({ entity_type, entity_id, action, field_name, old_value, new_value, user_id, user_name }) {
  await db.prepare(`
    INSERT INTO audit_log (entity_type, entity_id, action, field_name, old_value, new_value, user_id, user_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(entity_type, entity_id, action, field_name || null,
    old_value != null ? String(old_value) : null,
    new_value != null ? String(new_value) : null,
    user_id || null, user_name || null);
}

export async function logCreate(entity_type, entity_id, user) {
  await logAudit({ entity_type, entity_id, action: 'create', user_id: user?.id, user_name: user?.name });
}

export async function logUpdate(entity_type, entity_id, field, oldVal, newVal, user) {
  if (String(oldVal) !== String(newVal)) {
    await logAudit({ entity_type, entity_id, action: 'update', field_name: field, old_value: oldVal, new_value: newVal, user_id: user?.id, user_name: user?.name });
  }
}

export async function logDelete(entity_type, entity_id, user) {
  await logAudit({ entity_type, entity_id, action: 'delete', user_id: user?.id, user_name: user?.name });
}
