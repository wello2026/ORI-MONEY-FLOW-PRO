-- Phase 9: Notifications & Alerts Enhancement
-- Add priority, preferences, alert rules, and alert logging

-- 1. Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Push notification toggles
  push_approval BOOLEAN DEFAULT true,
  push_transaction BOOLEAN DEFAULT true,
  push_alert BOOLEAN DEFAULT true,
  push_info BOOLEAN DEFAULT true,
  push_summary BOOLEAN DEFAULT false,

  -- Alert thresholds
  treasury_low_balance_alert BOOLEAN DEFAULT true,
  treasury_low_balance_threshold NUMERIC DEFAULT 1000,
  partner_outstanding_alert BOOLEAN DEFAULT true,
  partner_outstanding_threshold NUMERIC DEFAULT 5000,
  supplier_overdue_alert BOOLEAN DEFAULT true,
  supplier_overdue_days INT DEFAULT 7,
  project_budget_alert BOOLEAN DEFAULT true,
  project_budget_threshold_pct NUMERIC DEFAULT 80,
  expense_approval_alert BOOLEAN DEFAULT true,

  -- Email preferences
  email_approval BOOLEAN DEFAULT true,
  email_alert BOOLEAN DEFAULT true,
  email_summary_daily BOOLEAN DEFAULT false,
  email_summary_weekly BOOLEAN DEFAULT false,

  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Create alert_rules table
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Rule definition
  rule_type TEXT NOT NULL
    CHECK (rule_type IN (
      'treasury_low_balance', 'treasury_high_spend', 'treasury_negative',
      'partner_outstanding', 'partner_overdue_days',
      'supplier_overdue_invoice', 'supplier_credit_limit',
      'project_budget_exceeded', 'project_budget_warning',
      'expense_over_limit', 'expense_unapproved_days',
      'journal_unbalanced', 'currency_deviation'
    )),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,

  -- Thresholds
  threshold_value NUMERIC DEFAULT 0,
  threshold_operator TEXT DEFAULT '>'
    CHECK (threshold_operator IN ('>', '<', '>=', '<=', '=', '!=')),
  notification_channel TEXT DEFAULT 'both'
    CHECK (notification_channel IN ('push', 'email', 'both', 'none')),

  -- Targeting
  target_entity_type TEXT,
  target_entity_id UUID,
  notify_user_ids UUID[],

  -- Timing
  check_frequency TEXT DEFAULT 'daily'
    CHECK (check_frequency IN ('realtime', 'hourly', 'daily', 'weekly')),
  last_checked TIMESTAMPTZ,
  last_triggered TIMESTAMPTZ,
  trigger_count INT DEFAULT 0,

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create alert_logs table
CREATE TABLE IF NOT EXISTS alert_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  alert_rule_id UUID REFERENCES alert_rules(id) ON DELETE SET NULL,

  -- Alert details
  alert_type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,

  -- Status
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  read_by UUID REFERENCES profiles(id),
  read_at TIMESTAMPTZ,

  -- Actions
  action_taken TEXT,
  action_by UUID REFERENCES profiles(id),
  action_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB,
  triggered_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS: notification_preferences
DROP POLICY IF EXISTS "notification_preferences_select" ON notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_insert" ON notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_update" ON notification_preferences;

CREATE POLICY "notification_preferences_select" ON notification_preferences FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "notification_preferences_insert" ON notification_preferences FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "notification_preferences_update" ON notification_preferences FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- 6. RLS: alert_rules
DROP POLICY IF EXISTS "alert_rules_select" ON alert_rules;
DROP POLICY IF EXISTS "alert_rules_insert" ON alert_rules;
DROP POLICY IF EXISTS "alert_rules_update" ON alert_rules;
DROP POLICY IF EXISTS "alert_rules_delete" ON alert_rules;

CREATE POLICY "alert_rules_select" ON alert_rules FOR SELECT TO authenticated
USING (
  company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
);

CREATE POLICY "alert_rules_insert" ON alert_rules FOR INSERT TO authenticated
WITH CHECK (
  company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = alert_rules.company_id AND role IN ('owner', 'admin'))
);

CREATE POLICY "alert_rules_update" ON alert_rules FOR UPDATE TO authenticated
USING (
  company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = alert_rules.company_id AND role IN ('owner', 'admin'))
);

CREATE POLICY "alert_rules_delete" ON alert_rules FOR DELETE TO authenticated
USING (
  company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = alert_rules.company_id AND role = 'owner')
);

-- 7. RLS: alert_logs
DROP POLICY IF EXISTS "alert_logs_select" ON alert_logs;
DROP POLICY IF EXISTS "alert_logs_update" ON alert_logs;

CREATE POLICY "alert_logs_select" ON alert_logs FOR SELECT TO authenticated
USING (
  company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
);

CREATE POLICY "alert_logs_update" ON alert_logs FOR UPDATE TO authenticated
USING (
  company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
);

-- 8. Audit triggers
DROP TRIGGER IF EXISTS audit_notification_preferences_changes ON notification_preferences;
CREATE TRIGGER audit_notification_preferences_changes
  AFTER INSERT OR UPDATE OR DELETE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_alert_rules_changes ON alert_rules;
CREATE TRIGGER audit_alert_rules_changes
  AFTER INSERT OR UPDATE OR DELETE ON alert_rules
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_alert_logs_changes ON alert_logs;
CREATE TRIGGER audit_alert_logs_changes
  AFTER INSERT OR UPDATE OR DELETE ON alert_logs
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

-- 9. Add priority to notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium'
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_entity_type TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_entity_id UUID;

-- 10. RPC: Update notification preferences
CREATE OR REPLACE FUNCTION upsert_notification_preferences(
  p_push_approval BOOLEAN DEFAULT true,
  p_push_transaction BOOLEAN DEFAULT true,
  p_push_alert BOOLEAN DEFAULT true,
  p_push_info BOOLEAN DEFAULT true,
  p_push_summary BOOLEAN DEFAULT false,
  p_treasury_low_balance_alert BOOLEAN DEFAULT true,
  p_treasury_low_balance_threshold NUMERIC DEFAULT 1000,
  p_partner_outstanding_alert BOOLEAN DEFAULT true,
  p_partner_outstanding_threshold NUMERIC DEFAULT 5000,
  p_supplier_overdue_alert BOOLEAN DEFAULT true,
  p_supplier_overdue_days INT DEFAULT 7,
  p_project_budget_alert BOOLEAN DEFAULT true,
  p_project_budget_threshold_pct NUMERIC DEFAULT 80,
  p_expense_approval_alert BOOLEAN DEFAULT true
)
RETURNS void AS $$
BEGIN
  INSERT INTO notification_preferences (
    user_id, company_id,
    push_approval, push_transaction, push_alert, push_info, push_summary,
    treasury_low_balance_alert, treasury_low_balance_threshold,
    partner_outstanding_alert, partner_outstanding_threshold,
    supplier_overdue_alert, supplier_overdue_days,
    project_budget_alert, project_budget_threshold_pct,
    expense_approval_alert
  ) VALUES (
    auth.uid(),
    get_user_current_company(),
    p_push_approval, p_push_transaction, p_push_alert, p_push_info, p_push_summary,
    p_treasury_low_balance_alert, p_treasury_low_balance_threshold,
    p_partner_outstanding_alert, p_partner_outstanding_threshold,
    p_supplier_overdue_alert, p_supplier_overdue_days,
    p_project_budget_alert, p_project_budget_threshold_pct,
    p_expense_approval_alert
  )
  ON CONFLICT (user_id) DO UPDATE SET
    push_approval = EXCLUDED.push_approval,
    push_transaction = EXCLUDED.push_transaction,
    push_alert = EXCLUDED.push_alert,
    push_info = EXCLUDED.push_info,
    push_summary = EXCLUDED.push_summary,
    treasury_low_balance_alert = EXCLUDED.treasury_low_balance_alert,
    treasury_low_balance_threshold = EXCLUDED.treasury_low_balance_threshold,
    partner_outstanding_alert = EXCLUDED.partner_outstanding_alert,
    partner_outstanding_threshold = EXCLUDED.partner_outstanding_threshold,
    supplier_overdue_alert = EXCLUDED.supplier_overdue_alert,
    supplier_overdue_days = EXCLUDED.supplier_overdue_days,
    project_budget_alert = EXCLUDED.project_budget_alert,
    project_budget_threshold_pct = EXCLUDED.project_budget_threshold_pct,
    expense_approval_alert = EXCLUDED.expense_approval_alert,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. RPC: Get notification preferences
CREATE OR REPLACE FUNCTION get_notification_preferences()
RETURNS notification_preferences AS $$
DECLARE
  v_prefs notification_preferences;
BEGIN
  SELECT * INTO v_prefs FROM notification_preferences WHERE user_id = auth.uid();
  RETURN v_prefs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. RPC: Get alert logs
CREATE OR REPLACE FUNCTION get_alert_logs(
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  p_severity TEXT DEFAULT NULL,
  p_is_read BOOLEAN DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  alert_type TEXT,
  severity TEXT,
  title TEXT,
  message TEXT,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN,
  is_dismissed BOOLEAN,
  action_taken TEXT,
  metadata JSONB,
  triggered_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.id, al.alert_type, al.severity, al.title, al.message,
    al.entity_type, al.entity_id, al.is_read, al.is_dismissed,
    al.action_taken, al.metadata, al.triggered_at
  FROM alert_logs al
  WHERE al.company_id = get_user_current_company()
    AND (p_severity IS NULL OR al.severity = p_severity)
    AND (p_is_read IS NULL OR al.is_read = p_is_read)
    AND al.is_dismissed = false
  ORDER BY al.triggered_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. RPC: Mark alert as read
CREATE OR REPLACE FUNCTION mark_alert_read(p_alert_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE alert_logs SET is_read = true, read_by = auth.uid(), read_at = NOW()
  WHERE id = p_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. RPC: Dismiss alert
CREATE OR REPLACE FUNCTION dismiss_alert(p_alert_id UUID, p_action_taken TEXT DEFAULT NULL)
RETURNS void AS $$
BEGIN
  UPDATE alert_logs SET is_dismissed = true, action_taken = p_action_taken, action_by = auth.uid(), action_at = NOW()
  WHERE id = p_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. RPC: Create alert rule
CREATE OR REPLACE FUNCTION create_alert_rule(
  p_rule_type TEXT,
  p_name TEXT,
  p_threshold_value NUMERIC DEFAULT 0,
  p_threshold_operator TEXT DEFAULT '>',
  p_notify_user_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS TABLE(success BOOLEAN, message TEXT, rule_id UUID) AS $$
DECLARE
  v_company_id UUID;
BEGIN
  v_company_id := get_user_current_company();
  IF v_company_id IS NULL THEN
    RETURN QUERY SELECT false, 'لا توجد شركة محددة', NULL::UUID;
    RETURN;
  END IF;

  RETURN QUERY
  INSERT INTO alert_rules (
    company_id, rule_type, name, threshold_value, threshold_operator,
    notify_user_ids, created_by
  ) VALUES (
    v_company_id, p_rule_type, p_name, p_threshold_value, p_threshold_operator,
    p_notify_user_ids, auth.uid()
  ) RETURNING true, 'تم إنشاء القاعدة بنجاح', id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. RPC: Check treasury balance alerts (called by scheduled job)
CREATE OR REPLACE FUNCTION check_treasury_balance_alerts()
RETURNS void AS $$
DECLARE
  v_treasury RECORD;
  v_threshold NUMERIC;
BEGIN
  FOR v_treasury IN
    SELECT t.id, t.treasury_name, t.current_balance, np.treasury_low_balance_threshold
    FROM treasuries t
    JOIN notification_preferences np ON np.company_id = t.company_id
    WHERE t.is_active = true
      AND t.current_balance <= COALESCE(np.treasury_low_balance_threshold, 1000)
      AND np.treasury_low_balance_alert = true
  LOOP
    -- Log alert
    INSERT INTO alert_logs (company_id, alert_type, severity, title, message, entity_type, entity_id, metadata)
    VALUES (
      (SELECT company_id FROM treasuries WHERE id = v_treasury.id),
      'treasury_low_balance', 'high',
      'انخفاض رصيد الخزينة',
      'رصيد الخزينة ' || v_treasury.treasury_name || ' منخفض: ' || v_treasury.current_balance::TEXT,
      'treasury', v_treasury.id,
      jsonb_build_object('current_balance', v_treasury.current_balance, 'threshold', v_treasury.treasury_low_balance_threshold)
    );

    -- Notify admins
    INSERT INTO notifications (user_id, title, body, type, priority, data)
    SELECT
      u.id,
      'تنبيه: رصيد منخفض',
      'الخزينة ' || v_treasury.treasury_name || ' رصيدها ' || v_treasury.current_balance::TEXT,
      'alert', 'high',
      jsonb_build_object('alert_type', 'treasury_low_balance', 'treasury_id', v_treasury.id)
    FROM user_companies uc
    JOIN profiles u ON u.id = uc.user_id
    WHERE uc.company_id = (SELECT company_id FROM treasuries WHERE id = v_treasury.id)
      AND uc.role IN ('owner', 'admin', 'treasury');
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. RPC: Check supplier overdue alerts
CREATE OR REPLACE FUNCTION check_supplier_overdue_alerts()
RETURNS void AS $$
DECLARE
  v_invoice RECORD;
BEGIN
  FOR v_invoice IN
    SELECT si.id, si.invoice_number, si.total_amount, si.amount_paid, si.due_date,
           s.supplier_name, np.supplier_overdue_days
    FROM supplier_invoices si
    JOIN suppliers s ON s.id = si.supplier_id
    JOIN notification_preferences np ON np.company_id = si.company_id
    WHERE si.status NOT IN ('paid', 'cancelled')
      AND si.due_date < CURRENT_DATE - COALESCE(np.supplier_overdue_days, 7)::INT
      AND np.supplier_overdue_alert = true
  LOOP
    INSERT INTO alert_logs (company_id, alert_type, severity, title, message, entity_type, entity_id, metadata)
    VALUES (
      (SELECT company_id FROM supplier_invoices WHERE id = v_invoice.id),
      'supplier_overdue_invoice', 'medium',
      'فاتورة مورد متأخرة',
      'فاتورة ' || v_invoice.supplier_name || ' (#' || v_invoice.invoice_number || ') مستحقة منذ ' || EXTRACT(DAY FROM (CURRENT_DATE - v_invoice.due_date))::TEXT || ' أيام',
      'supplier_invoice', v_invoice.id,
      jsonb_build_object('due_date', v_invoice.due_date, 'overdue_days', EXTRACT(DAY FROM (CURRENT_DATE - v_invoice.due_date)))
    );

    INSERT INTO notifications (user_id, title, body, type, priority, data)
    SELECT
      u.id,
      'فاتورة مورد متأخرة',
      v_invoice.supplier_name || ' - فاتورة #' || v_invoice.invoice_number || ' مستحقة',
      'alert', 'medium',
      jsonb_build_object('alert_type', 'supplier_overdue', 'invoice_id', v_invoice.id)
    FROM user_companies uc
    JOIN profiles u ON u.id = uc.user_id
    WHERE uc.company_id = (SELECT company_id FROM supplier_invoices WHERE id = v_invoice.id)
      AND uc.role IN ('owner', 'admin', 'accountant');
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 18. RPC: Check project budget alerts
CREATE OR REPLACE FUNCTION check_project_budget_alerts()
RETURNS void AS $$
DECLARE
  v_project RECORD;
  v_utilization NUMERIC;
BEGIN
  FOR v_project IN
    SELECT p.id, p.name, p.budget, p.company_id, np.project_budget_threshold_pct,
           COALESCE(SUM(pe.amount_in_base), 0) as total_spent
    FROM projects p
    JOIN notification_preferences np ON np.company_id = p.company_id
    LEFT JOIN project_expenses pe ON pe.project_id = p.id AND pe.status = 'approved'
    WHERE p.status = 'active'
      AND np.project_budget_alert = true
      AND p.budget > 0
    GROUP BY p.id, p.name, p.budget, p.company_id, np.project_budget_threshold_pct
  LOOP
    v_utilization := (v_project.total_spent / v_project.budget) * 100;
    IF v_utilization >= v_project.project_budget_threshold_pct THEN
      INSERT INTO alert_logs (company_id, alert_type, severity, title, message, entity_type, entity_id, metadata)
      VALUES (
        v_project.company_id, 'project_budget_warning',
        CASE WHEN v_utilization >= 100 THEN 'critical' WHEN v_utilization >= 90 THEN 'high' ELSE 'medium' END,
        'تحذير: تجاوز ميزانية المشروع',
        'مشروع ' || v_project.name || ' استخدم ' || ROUND(v_utilization, 1)::TEXT || '% من الميزانية',
        'project', v_project.id,
        jsonb_build_object('budget', v_project.budget, 'spent', v_project.total_spent, 'utilization', v_utilization)
      );

      INSERT INTO notifications (user_id, title, body, type, priority, data)
      SELECT
        u.id,
        'تحذير: تجاوز ميزانية مشروع',
        v_project.name || ' - ' || ROUND(v_utilization, 1)::TEXT || '% من الميزانية',
        'alert', CASE WHEN v_utilization >= 100 THEN 'urgent' ELSE 'high' END,
        jsonb_build_object('alert_type', 'project_budget', 'project_id', v_project.id)
      FROM user_companies uc
      JOIN profiles u ON u.id = uc.user_id
      WHERE uc.company_id = v_project.company_id
        AND uc.role IN ('owner', 'admin', 'operations');
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 19. Indexes
CREATE INDEX IF NOT EXISTS idx_alert_logs_company ON alert_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_alert_logs_severity ON alert_logs(severity);
CREATE INDEX IF NOT EXISTS idx_alert_logs_triggered ON alert_logs(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_rules_company ON alert_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_type ON alert_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);