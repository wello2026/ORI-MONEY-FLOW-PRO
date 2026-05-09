-- 009_notification_triggers.sql
-- Phase 5: Real-time Notification Triggers

-- 1. Function to handle notification generation
CREATE OR REPLACE FUNCTION handle_notification_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_id UUID;
  v_creator_name TEXT;
  v_title TEXT;
  v_body TEXT;
  v_type TEXT;
  v_amount TEXT;
BEGIN
  -- Get creator name if exists
  IF (NEW.created_by IS NOT NULL) THEN
    SELECT full_name INTO v_creator_name FROM profiles WHERE id = NEW.created_by;
  END IF;

  v_amount := NEW.amount::TEXT || ' LYD';

  -- A. LOGIC FOR NEW RECORDS (INSERT)
  IF (TG_OP = 'INSERT' AND NEW.status = 'pending') THEN
    -- Notify all admins and super_admins
    FOR v_admin_id IN (
      SELECT id FROM profiles 
      WHERE role IN ('admin', 'super_admin') 
      AND id != COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000'::UUID)
      AND is_active = true
    ) LOOP
      IF (TG_TABLE_NAME = 'transfers') THEN
        v_title := 'طلب تحويل جديد';
        v_body := 'قام ' || COALESCE(v_creator_name, 'موظف') || ' بطلب تحويل بمبلغ ' || v_amount;
      ELSE
        v_title := 'طلب معاملة جديدة';
        v_body := 'قام ' || COALESCE(v_creator_name, 'موظف') || ' بطلب ' || NEW.type || ' بمبلغ ' || v_amount;
      END IF;

      INSERT INTO notifications (user_id, title, body, type, data)
      VALUES (
        v_admin_id,
        v_title,
        v_body,
        'approval',
        jsonb_build_object(
          'entity_type', CASE WHEN TG_TABLE_NAME = 'transfers' THEN 'transfer' ELSE 'transaction' END,
          'entity_id', NEW.id
        )
      );
    END LOOP;
  END IF;

  -- B. LOGIC FOR UPDATED RECORDS (STATUS CHANGE)
  IF (TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected')) THEN
    IF (NEW.created_by IS NOT NULL) THEN
      IF (TG_TABLE_NAME = 'transfers') THEN
        v_title := CASE WHEN NEW.status = 'approved' THEN 'تمت الموافقة على التحويل' ELSE 'تم رفض التحويل' END;
        v_body := 'تم ' || (CASE WHEN NEW.status = 'approved' THEN 'قبول' ELSE 'رفض' END) || ' طلب التحويل الخاص بك بمبلغ ' || v_amount;
      ELSE
        v_title := CASE WHEN NEW.status = 'approved' THEN 'تمت الموافقة على المعاملة' ELSE 'تم رفض المعاملة' END;
        v_body := 'تم ' || (CASE WHEN NEW.status = 'approved' THEN 'قبول' ELSE 'رفض' END) || ' طلب الـ ' || NEW.type || ' الخاص بك بمبلغ ' || v_amount;
      END IF;

      INSERT INTO notifications (user_id, title, body, type, data)
      VALUES (
        NEW.created_by,
        v_title,
        v_body,
        CASE WHEN NEW.status = 'approved' THEN 'info' ELSE 'alert' END,
        jsonb_build_object(
          'entity_type', CASE WHEN TG_TABLE_NAME = 'transfers' THEN 'transfer' ELSE 'transaction' END,
          'entity_id', NEW.id
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create Triggers
DROP TRIGGER IF EXISTS on_transfer_notification ON transfers;
CREATE TRIGGER on_transfer_notification
AFTER INSERT OR UPDATE ON transfers
FOR EACH ROW EXECUTE FUNCTION handle_notification_trigger();

DROP TRIGGER IF EXISTS on_transaction_notification ON transactions;
CREATE TRIGGER on_transaction_notification
AFTER INSERT OR UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION handle_notification_trigger();
