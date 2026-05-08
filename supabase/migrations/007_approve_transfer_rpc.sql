-- 1. Create approve_transfer RPC for atomic balance updates on the server
CREATE OR REPLACE FUNCTION approve_transfer(transfer_id UUID, approver_id UUID)
RETURNS void AS $$
DECLARE
  v_transfer RECORD;
BEGIN
  -- Get transfer details
  SELECT * INTO v_transfer FROM transfers WHERE id = transfer_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'التحويل غير موجود';
  END IF;
  
  IF v_transfer.status = 'approved' THEN
    RETURN;
  END IF;

  -- 1. Update source account balance (subtract)
  UPDATE accounts 
  SET balance = balance - v_transfer.amount,
      updated_at = NOW()
  WHERE id = v_transfer.source_account_id;

  -- 2. Update destination account balance (add)
  UPDATE accounts 
  SET balance = balance + v_transfer.amount,
      updated_at = NOW()
  WHERE id = v_transfer.destination_account_id;

  -- 3. Update transfer status
  UPDATE transfers 
  SET status = 'approved',
      approved_by = approver_id,
      created_at = created_at -- Keep original timestamp
  WHERE id = transfer_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
