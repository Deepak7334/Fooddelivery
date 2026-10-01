const fs = require('fs');

function patchRestaurants() {
  const file = 'frontend/src/pages/admin/AdminRestaurants.jsx';
  let content = fs.readFileSync(file, 'utf8');

  // Add serviceAreaId to emptyForm
  content = content.replace(
    "deliveryTime: '30-40 mins', deliveryFee: 30, minOrder: 100, phone: '', ownerEmail: '', ownerPassword: '', ownerName: '', customCommissionRate: '' };",
    "deliveryTime: '30-40 mins', deliveryFee: 30, minOrder: 100, phone: '', ownerEmail: '', ownerPassword: '', ownerName: '', customCommissionRate: '', serviceAreaId: '' };"
  );

  // Add serviceAreaId to openEdit
  content = content.replace(
    "setEditing(r._id); setShowModal(true);",
    "setForm(prev => ({...prev, serviceAreaId: r.serviceAreaIds?.[0] || ''}));\n      setEditing(r._id); setShowModal(true);"
  );

  // Add Select Zone dropdown to the form
  const dropdownHtml = `
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Zone (Service Area)</label>
              <select className="form-input" value={form.serviceAreaId || ''} onChange={e => setForm({...form, serviceAreaId: e.target.value})}>
                <option value="">-- Select Zone --</option>
                {serviceAreas.map(sa => <option key={sa._id} value={sa._id}>{sa.name} ({sa.city})</option>)}
              </select>
            </div>
`;
  content = content.replace(
    "                  <div className=\"form-group\" style={{ gridColumn: '1 / -1' }}>",
    dropdownHtml + "                  <div className=\"form-group\" style={{ gridColumn: '1 / -1' }}>"
  );

  fs.writeFileSync(file, content);
}

function patchStores() {
  const file = 'frontend/src/pages/admin/AdminStores.jsx';
  let content = fs.readFileSync(file, 'utf8');

  // Find where fields are mapped for the form
  const dropdownHtml = `
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">Zone (Service Area)</label>
                      <select className="form-input" value={form.serviceAreaId || ''} onChange={e => setForm({...form, serviceAreaId: e.target.value})}>
                        <option value="">-- Select Zone --</option>
                        {serviceAreas.map(sa => <option key={sa._id} value={sa._id}>{sa.name} ({sa.city})</option>)}
                      </select>
                    </div>
`;
  content = content.replace(
    "                  {[",
    dropdownHtml + "                  {["
  );

  fs.writeFileSync(file, content);
}

patchRestaurants();
patchStores();
console.log('done');
