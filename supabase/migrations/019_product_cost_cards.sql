-- Phase 7: Product Cost Cards
-- Cost cards for manufactured products with material + labor + accessory breakdown

-- 1. Create product_cost_cards table
CREATE TABLE IF NOT EXISTS product_cost_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  card_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_name_ar TEXT,
  product_category TEXT,
  unit_of_measure TEXT DEFAULT 'unit',
  description TEXT,
  -- Cost components
  material_cost NUMERIC(20, 4) DEFAULT 0,
  labor_cost NUMERIC(20, 4) DEFAULT 0,
  accessory_cost NUMERIC(20, 4) DEFAULT 0,
  overhead_cost NUMERIC(20, 4) DEFAULT 0,
  -- Total and margin
  total_cost NUMERIC(20, 4) DEFAULT 0,
  selling_price NUMERIC(20, 4) DEFAULT 0,
  target_margin_pct NUMERIC(5, 2) DEFAULT 20,
  -- Currency and rates
  currency_code TEXT DEFAULT 'USD',
  labor_rate_per_hour NUMERIC(20, 4) DEFAULT 0,
  labor_hours NUMERIC(20, 4) DEFAULT 0,
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, card_code)
);

-- 2. Create product_cost_components table
CREATE TABLE IF NOT EXISTS product_cost_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cost_card_id UUID NOT NULL REFERENCES product_cost_cards(id) ON DELETE CASCADE,
  component_type TEXT NOT NULL
    CHECK (component_type IN ('material', 'labor', 'accessory', 'overhead', 'other')),
  component_name TEXT NOT NULL,
  component_name_ar TEXT,
  quantity NUMERIC(20, 4) DEFAULT 1,
  unit_cost NUMERIC(20, 4) DEFAULT 0,
  total_cost NUMERIC(20, 4) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  currency_code TEXT DEFAULT 'USD',
  supplier_id UUID REFERENCES suppliers(id),
  reference_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create cost calculation view
CREATE OR REPLACE VIEW v_product_cost_summary AS
SELECT
  pcc.id,
  pcc.company_id,
  pcc.card_code,
  pcc.product_name,
  pcc.product_name_ar,
  pcc.product_category,
  pcc.unit_of_measure,
  pcc.total_cost,
  pcc.selling_price,
  pcc.target_margin_pct,
  pcc.currency_code,
  COALESCE(SUM(pcc2.total_cost), 0) as component_cost,
  CASE WHEN pcc.total_cost > 0
    THEN ((pcc.selling_price - pcc.total_cost) / pcc.total_cost * 100)
    ELSE 0 END as actual_margin_pct,
  COUNT(DISTINCT pcc2.id) as component_count
FROM product_cost_cards pcc
LEFT JOIN product_cost_components pcc2 ON pcc2.cost_card_id = pcc.id
WHERE pcc.is_active = true
GROUP BY pcc.id, pcc.company_id, pcc.card_code, pcc.product_name, pcc.product_name_ar,
         pcc.product_category, pcc.unit_of_measure, pcc.total_cost, pcc.selling_price,
         pcc.target_margin_pct, pcc.currency_code;

-- 4. Enable RLS
ALTER TABLE product_cost_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_cost_components ENABLE ROW LEVEL SECURITY;

-- 5. RLS: product_cost_cards
DROP POLICY IF EXISTS "product_cost_cards_select" ON product_cost_cards;
DROP POLICY IF EXISTS "product_cost_cards_insert" ON product_cost_cards;
DROP POLICY IF EXISTS "product_cost_cards_update" ON product_cost_cards;
DROP POLICY IF EXISTS "product_cost_cards_delete" ON product_cost_cards;
CREATE POLICY "product_cost_cards_select" ON product_cost_cards FOR SELECT TO authenticated
USING (company_id = get_user_current_company());
CREATE POLICY "product_cost_cards_insert" ON product_cost_cards FOR INSERT TO authenticated
WITH CHECK (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin', 'operations'))
);
CREATE POLICY "product_cost_cards_update" ON product_cost_cards FOR UPDATE TO authenticated
USING (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin', 'operations'))
);
CREATE POLICY "product_cost_cards_delete" ON product_cost_cards FOR DELETE TO authenticated
USING (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin'))
);

-- 6. RLS: product_cost_components
DROP POLICY IF EXISTS "product_cost_components_select" ON product_cost_components;
DROP POLICY IF EXISTS "product_cost_components_insert" ON product_cost_components;
DROP POLICY IF EXISTS "product_cost_components_update" ON product_cost_components;
DROP POLICY IF EXISTS "product_cost_components_delete" ON product_cost_components;
CREATE POLICY "product_cost_components_select" ON product_cost_components FOR SELECT TO authenticated
USING (company_id = get_user_current_company());
CREATE POLICY "product_cost_components_insert" ON product_cost_components FOR INSERT TO authenticated
WITH CHECK (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin', 'operations'))
);
CREATE POLICY "product_cost_components_update" ON product_cost_components FOR UPDATE TO authenticated
USING (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin', 'operations'))
);
CREATE POLICY "product_cost_components_delete" ON product_cost_components FOR DELETE TO authenticated
USING (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin'))
);

-- 7. Update timestamp trigger
CREATE OR REPLACE FUNCTION update_product_cost_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_updated = NOW();
  -- Auto-calculate total_cost from components
  SELECT COALESCE(SUM(quantity * unit_cost), 0) INTO NEW.total_cost
  FROM product_cost_components WHERE cost_card_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_product_cost_cards_updated_at ON product_cost_cards;
CREATE TRIGGER update_product_cost_cards_updated_at
  BEFORE UPDATE ON product_cost_cards FOR EACH ROW EXECUTE FUNCTION update_product_cost_cards_updated_at();

-- 8. Audit triggers
DROP TRIGGER IF EXISTS audit_product_cost_cards_changes ON product_cost_cards;
CREATE TRIGGER audit_product_cost_cards_changes
  AFTER INSERT OR UPDATE OR DELETE ON product_cost_cards
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_product_cost_components_changes ON product_cost_components;
CREATE TRIGGER audit_product_cost_components_changes
  AFTER INSERT OR UPDATE OR DELETE ON product_cost_components
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

-- 9. Indexes
CREATE INDEX IF NOT EXISTS idx_product_cost_cards_company ON product_cost_cards(company_id);
CREATE INDEX IF NOT EXISTS idx_product_cost_cards_code ON product_cost_cards(card_code);
CREATE INDEX IF NOT EXISTS idx_product_cost_cards_category ON product_cost_cards(product_category);
CREATE INDEX IF NOT EXISTS idx_product_cost_components_card ON product_cost_components(cost_card_id);
CREATE INDEX IF NOT EXISTS idx_product_cost_components_type ON product_cost_components(component_type);

-- 10. RPC: Get products with cost summary
CREATE OR REPLACE FUNCTION get_product_cost_cards()
RETURNS TABLE(
  id UUID,
  card_code TEXT,
  product_name TEXT,
  product_name_ar TEXT,
  product_category TEXT,
  unit_of_measure TEXT,
  material_cost NUMERIC,
  labor_cost NUMERIC,
  accessory_cost NUMERIC,
  overhead_cost NUMERIC,
  total_cost NUMERIC,
  selling_price NUMERIC,
  target_margin_pct NUMERIC,
  actual_margin_pct NUMERIC,
  currency_code TEXT,
  component_count BIGINT,
  is_active BOOLEAN
) AS $$
DECLARE
  v_company_id UUID;
BEGIN
  v_company_id := get_user_current_company();

  RETURN QUERY
  SELECT
    pcc.id,
    pcc.card_code,
    pcc.product_name,
    pcc.product_name_ar,
    pcc.product_category,
    pcc.unit_of_measure,
    pcc.material_cost,
    pcc.labor_cost,
    pcc.accessory_cost,
    pcc.overhead_cost,
    pcc.total_cost,
    pcc.selling_price,
    pcc.target_margin_pct,
    CASE WHEN pcc.total_cost > 0
      THEN ((pcc.selling_price - pcc.total_cost) / pcc.total_cost * 100)
      ELSE 0 END as actual_margin_pct,
    pcc.currency_code,
    COUNT(pcc2.id) as component_count,
    pcc.is_active
  FROM product_cost_cards pcc
  LEFT JOIN product_cost_components pcc2 ON pcc2.cost_card_id = pcc.id
  WHERE pcc.company_id = v_company_id AND pcc.is_active = true
  GROUP BY pcc.id, pcc.card_code, pcc.product_name, pcc.product_name_ar,
           pcc.product_category, pcc.unit_of_measure, pcc.material_cost,
           pcc.labor_cost, pcc.accessory_cost, pcc.overhead_cost, pcc.total_cost,
           pcc.selling_price, pcc.target_margin_pct, pcc.currency_code, pcc.is_active
  ORDER BY pcc.product_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. RPC: Get cost card detail with components
CREATE OR REPLACE FUNCTION get_cost_card_detail(p_card_id UUID)
RETURNS TABLE(
  card_id UUID,
  card_code TEXT,
  product_name TEXT,
  product_name_ar TEXT,
  product_category TEXT,
  unit_of_measure TEXT,
  material_cost NUMERIC,
  labor_cost NUMERIC,
  accessory_cost NUMERIC,
  overhead_cost NUMERIC,
  total_cost NUMERIC,
  selling_price NUMERIC,
  target_margin_pct NUMERIC,
  currency_code TEXT,
  actual_margin_pct NUMERIC,
  component_id UUID,
  component_type TEXT,
  component_name TEXT,
  component_name_ar TEXT,
  quantity NUMERIC,
  unit_cost NUMERIC,
  total_component_cost NUMERIC,
  supplier_name TEXT,
  reference_number TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pcc.id as card_id,
    pcc.card_code,
    pcc.product_name,
    pcc.product_name_ar,
    pcc.product_category,
    pcc.unit_of_measure,
    pcc.material_cost,
    pcc.labor_cost,
    pcc.accessory_cost,
    pcc.overhead_cost,
    pcc.total_cost,
    pcc.selling_price,
    pcc.target_margin_pct,
    pcc.currency_code,
    CASE WHEN pcc.total_cost > 0
      THEN ((pcc.selling_price - pcc.total_cost) / pcc.total_cost * 100)
      ELSE 0 END as actual_margin_pct,
    pcc2.id as component_id,
    pcc2.component_type,
    pcc2.component_name,
    pcc2.component_name_ar,
    pcc2.quantity,
    pcc2.unit_cost,
    pcc2.total_cost as total_component_cost,
    COALESCE(s.supplier_name, '—') as supplier_name,
    COALESCE(pcc2.reference_number, '—') as reference_number,
    pcc2.created_at
  FROM product_cost_cards pcc
  LEFT JOIN product_cost_components pcc2 ON pcc2.cost_card_id = pcc.id
  LEFT JOIN suppliers s ON s.id = pcc2.supplier_id
  WHERE pcc.id = p_card_id
  ORDER BY pcc2.component_type, pcc2.component_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. RPC: Add component to cost card
CREATE OR REPLACE FUNCTION add_cost_component(
  p_cost_card_id UUID,
  p_component_type TEXT,
  p_component_name TEXT,
  p_quantity NUMERIC DEFAULT 1,
  p_unit_cost NUMERIC DEFAULT 0,
  p_supplier_id UUID DEFAULT NULL,
  p_reference_number TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT, component_id UUID) AS $$
DECLARE
  v_card product_cost_cards%ROWTYPE;
  v_company_id UUID;
  v_comp_id UUID;
BEGIN
  SELECT * INTO v_card FROM product_cost_cards WHERE id = p_cost_card_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'بطاقة التكلفة غير موجودة', NULL::UUID;
    RETURN;
  END IF;

  v_company_id := v_card.company_id;

  INSERT INTO product_cost_components (
    company_id, cost_card_id, component_type, component_name, quantity,
    unit_cost, currency_code, supplier_id, reference_number, notes, created_by
  ) VALUES (
    v_company_id, p_cost_card_id, p_component_type, p_component_name, p_quantity,
    p_unit_cost, v_card.currency_code, p_supplier_id, p_reference_number, p_notes, auth.uid()
  ) RETURNING id INTO v_comp_id;

  -- Update card totals based on component types
  UPDATE product_cost_cards SET updated_at = NOW(), last_updated = NOW()
  WHERE id = p_cost_card_id;

  RETURN QUERY SELECT true, 'تم إضافة المكون بنجاح', v_comp_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. RPC: Remove component from cost card
CREATE OR REPLACE FUNCTION remove_cost_component(p_component_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
BEGIN
  DELETE FROM product_cost_components WHERE id = p_component_id;
  RETURN QUERY SELECT true, 'تم حذف المكون';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
