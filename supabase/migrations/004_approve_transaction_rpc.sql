-- Create an RPC to safely approve a transaction and update the account balance atomically
-- This prevents race conditions where multiple users might approve transactions simultaneously

CREATE OR REPLACE FUNCTION approve_transaction(tx_id UUID, approver_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    tx_amount DECIMAL;
    tx_type TEXT;
    acc_id UUID;
    is_deposit BOOLEAN;
    is_withdrawal BOOLEAN;
BEGIN
    -- Get transaction details and lock the row to prevent concurrent modifications
    SELECT amount, type, account_id 
    INTO tx_amount, tx_type, acc_id
    FROM transactions 
    WHERE id = tx_id AND status = 'pending'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaction not found or not in pending status';
    END IF;

    -- Update transaction status
    UPDATE transactions
    SET status = 'approved',
        approved_by = approver_id,
        updated_at = NOW()
    WHERE id = tx_id;

    -- Determine operation
    is_deposit := tx_type IN ('deposit', 'income');
    is_withdrawal := tx_type IN ('withdrawal', 'expense', 'salary');

    -- Update account balance safely
    IF is_deposit THEN
        UPDATE accounts
        SET balance = balance + tx_amount,
            updated_at = NOW()
        WHERE id = acc_id;
    ELSIF is_withdrawal THEN
        UPDATE accounts
        SET balance = balance - tx_amount,
            updated_at = NOW()
        WHERE id = acc_id;
    END IF;

    RETURN true;
END;
$$;
