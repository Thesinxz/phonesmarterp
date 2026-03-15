-- Migration 078: In-App Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id),      -- NULL = todas as unidades
  user_id UUID REFERENCES auth.users(id), -- NULL = todos da unidade
  message TEXT NOT NULL,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see notifications for their store or all" 
ON notifications FOR SELECT
USING (
  tenant_id = (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid() LIMIT 1) 
  AND (
    unit_id IS NULL 
    OR unit_id = (SELECT unit_id FROM usuarios WHERE auth_user_id = auth.uid() LIMIT 1)
  )
  AND (
    user_id IS NULL
    OR user_id = auth.uid()
  )
);

CREATE POLICY "System can insert notifications"
ON notifications FOR INSERT
WITH CHECK (true);

-- Indexes
CREATE INDEX idx_notifications_tenant_unit ON notifications(tenant_id, unit_id);
CREATE INDEX idx_notifications_user ON notifications(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_notifications_read ON notifications(read_at) WHERE read_at IS NULL;
