-- Phase 2: Double-Entry Accounting Architecture

-- 1. Add offset_account_id to transactions to support double-entry
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS offset_account_id UUID REFERENCES accounts(id);

-- 2. Create Journal Entries tables
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source_type VARCHAR(50), -- 'transaction', 'transfer', 'manual'
    source_id UUID,
    created_by UUID REFERENCES profiles(id) NOT NULL,
    status VARCHAR(20) DEFAULT 'posted',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) NOT NULL,
    debit DECIMAL DEFAULT 0,
    credit DECIMAL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for new tables
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view journal_entries" ON journal_entries;
CREATE POLICY "Users can view journal_entries" ON journal_entries FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can view journal_entry_lines" ON journal_entry_lines;
CREATE POLICY "Users can view journal_entry_lines" ON journal_entry_lines FOR SELECT TO authenticated USING (true);

-- 3. Modify approve_transaction RPC to also generate Journal Entries and handle offset account
CREATE OR REPLACE FUNCTION approve_transaction(tx_id UUID, approver_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    tx_amount DECIMAL;
    tx_type TEXT;
    acc_id UUID;
    offset_acc_id UUID;
    tx_ref TEXT;
    tx_desc TEXT;
    tx_creator UUID;
    je_id UUID;
    is_deposit BOOLEAN;
    is_withdrawal BOOLEAN;
BEGIN
    SELECT amount, type, account_id, offset_account_id, reference, description, created_by 
    INTO tx_amount, tx_type, acc_id, offset_acc_id, tx_ref, tx_desc, tx_creator
    FROM transactions 
    WHERE id = tx_id AND status = 'pending'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaction not found or not in pending status';
    END IF;

    UPDATE transactions
    SET status = 'approved',
        approved_by = approver_id,
        updated_at = NOW()
    WHERE id = tx_id;

    is_deposit := tx_type IN ('deposit', 'income');
    is_withdrawal := tx_type IN ('withdrawal', 'expense', 'salary');

    -- Create Journal Entry
    INSERT INTO journal_entries (reference, description, source_type, source_id, created_by)
    VALUES ('JE-' || tx_ref, tx_desc, 'transaction', tx_id, approver_id)
    RETURNING id INTO je_id;

    IF is_deposit THEN
        -- Cash Account: Debit (Increases Cash)
        UPDATE accounts SET balance = balance + tx_amount, updated_at = NOW() WHERE id = acc_id;
        INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit) VALUES (je_id, acc_id, tx_amount, 0);
        
        IF offset_acc_id IS NOT NULL THEN
            -- Offset (e.g. Income): Credit (Increases Income)
            UPDATE accounts SET balance = balance + tx_amount, updated_at = NOW() WHERE id = offset_acc_id;
            INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit) VALUES (je_id, offset_acc_id, 0, tx_amount);
        END IF;

    ELSIF is_withdrawal THEN
        -- Cash Account: Credit (Decreases Cash)
        UPDATE accounts SET balance = balance - tx_amount, updated_at = NOW() WHERE id = acc_id;
        INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit) VALUES (je_id, acc_id, 0, tx_amount);
        
        IF offset_acc_id IS NOT NULL THEN
            -- Offset (e.g. Expense): Debit (Increases Expense)
            UPDATE accounts SET balance = balance + tx_amount, updated_at = NOW() WHERE id = offset_acc_id;
            INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit) VALUES (je_id, offset_acc_id, tx_amount, 0);
        END IF;
    END IF;

    RETURN true;
END;
$$;
