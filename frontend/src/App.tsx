import { useEffect, useState } from 'react'
import {
  Activity, ArrowDownToLine, ArrowRight, BarChart3, Beef, CalendarDays,
  Check, ChevronDown, CircleHelp, ClipboardList, MapPin as FieldIcon,
  Leaf, LogOut, Menu, Plus, Search, Settings2, Sprout, Tractor, TrendingUp, Wheat, X,
} from 'lucide-react'
import {
  api, Crop, CropStatus, Dashboard, ExpenseCategory, ExpenseList, Field, Harvest,
  jsonBody, Livestock, Session, setToken, putBody,
} from './api'

type View = 'dashboard' | 'fields' | 'crops' | 'harvests' | 'expenses' | 'livestock'
type Entity = 'field' | 'crop' | 'harvest' | 'expense' | 'livestock'

const navigation: { id: View; label: string; icon: typeof Leaf }[] = [
  { id: 'dashboard', label: 'Overview', icon: BarChart3 },
  { id: 'fields', label: 'Fields', icon: FieldIcon },
  { id: 'crops', label: 'Crops', icon: Sprout },
  { id: 'harvests', label: 'Harvests', icon: Wheat },
  { id: 'expenses', label: 'Expenses', icon: ClipboardList },
  { id: 'livestock', label: 'Livestock', icon: Beef },
]

const today = new Date().toISOString().slice(0, 10)
const blankForm = (entity: Entity): Record<string, string> => {
  if (entity === 'field') return { name: '', location: '', sizeHectares: '', soilType: '' }
  if (entity === 'crop') return { name: '', type: '', plantingDate: today, expectedHarvestDate: '', status: 'PLANTED' }
  if (entity === 'harvest') return { harvestDate: today, yieldQuantity: '', unit: 'KG' }
  if (entity === 'expense') return { category: 'SEEDS', amount: '', expenseDate: today }
  return { type: '', count: '0', healthStatus: '', acquisitionDate: today, fieldId: '' }
}

const titleFor: Record<View, string> = {
  dashboard: 'Overview', fields: 'Your fields', crops: 'Crop plan',
  harvests: 'Harvest records', expenses: 'Expense ledger', livestock: 'Livestock',
}

function amount(value: number | null | undefined) {
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value ?? 0)
}

function dateLabel(value: string | null | undefined) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

function App() {
  const [session, setSession] = useState<Session | null>(() => {
    const token = localStorage.getItem('farm-token')
    const account = localStorage.getItem('farm-account')
    if (!token || !account) return null
    setToken(token)
    return JSON.parse(account) as Session
  })
  const [view, setView] = useState<View>('dashboard')
  const [fields, setFields] = useState<Field[]>([])
  const [crops, setCrops] = useState<Crop[]>([])
  const [harvests, setHarvests] = useState<Record<number, Harvest>>({})
  const [expenses, setExpenses] = useState<Record<number, ExpenseList>>({})
  const [livestock, setLivestock] = useState<Livestock[]>([])
  const [summary, setSummary] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [form, setForm] = useState<{ entity: Entity; id?: number; cropId?: number; values: Record<string, string> } | null>(null)

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [nextFields, nextCrops, nextLivestock, nextSummary] = await Promise.all([
        api<Field[]>('/fields'), api<Crop[]>('/crops'), api<Livestock[]>('/livestock'), api<Dashboard>('/dashboard'),
      ])
      const cropDetails = await Promise.all(nextCrops.map(async crop => {
        const [harvest, expenseList] = await Promise.all([
          api<Harvest | null>(`/crops/${crop.id}/harvest`), api<ExpenseList>(`/crops/${crop.id}/expenses`),
        ])
        return { cropId: crop.id, harvest, expenseList }
      }))
      setFields(nextFields)
      setCrops(nextCrops)
      setLivestock(nextLivestock)
      setSummary(nextSummary)
      setHarvests(Object.fromEntries(cropDetails.filter(item => item.harvest).map(item => [item.cropId, item.harvest!])))
      setExpenses(Object.fromEntries(cropDetails.map(item => [item.cropId, item.expenseList])))
    } catch (issue) {
      const message = issue instanceof Error ? issue.message : 'Could not load farm data'
      if (message.includes('401') || message.toLowerCase().includes('unauthorized')) signOut()
      else setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) void loadData()
  }, [session])

  function signOut() {
    setToken(null)
    localStorage.removeItem('farm-account')
    setSession(null)
    setFields([])
    setCrops([])
    setSummary(null)
  }

  function acceptSession(value: Session) {
    setToken(value.token)
    localStorage.setItem('farm-account', JSON.stringify(value))
    setSession(value)
  }

  function openForm(entity: Entity, values?: Record<string, string>, id?: number, cropId?: number) {
    setError('')
    setForm({ entity, id, cropId, values: values ?? blankForm(entity) })
  }

  async function saveForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form) return
    setError('')
    const { entity, id, cropId, values } = form
    try {
      if (entity === 'field') {
        const payload = { ...values, sizeHectares: Number(values.sizeHectares) }
        await api(`/fields${id ? `/${id}` : ''}`, id ? putBody(payload) : jsonBody(payload))
      } else if (entity === 'crop') {
        const payload = {
          name: values.name,
          type: values.type,
          plantingDate: values.plantingDate || null,
          expectedHarvestDate: values.expectedHarvestDate || null,
          status: values.status,
        }
        await api(id ? `/crops/${id}` : `/fields/${values.fieldId}/crops`, id ? putBody(payload) : jsonBody(payload))
      } else if (entity === 'harvest' && cropId) {
        await api(`/crops/${cropId}/harvest`, jsonBody({ ...values, yieldQuantity: Number(values.yieldQuantity) }))
      } else if (entity === 'expense' && cropId) {
        await api(`/crops/${cropId}/expenses`, jsonBody({ ...values, amount: Number(values.amount) }))
      } else if (entity === 'livestock') {
        const payload = { ...values, count: Number(values.count), fieldId: Number(values.fieldId), acquisitionDate: values.acquisitionDate || null }
        await api(id ? `/livestock/${id}` : '/livestock', id ? putBody(payload) : jsonBody(payload))
      }
      setForm(null)
      await loadData()
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not save this record')
    }
  }

  async function remove(entity: 'field' | 'crop' | 'livestock', id: number, label: string) {
    const relatedCropCount = entity === 'field' ? crops.filter(crop => (crop as Crop & { fieldId?: number }).fieldId === id).length : 0
    const warning = relatedCropCount > 0 ? ` This field has ${relatedCropCount} crop${relatedCropCount === 1 ? '' : 's'}; remove them first.` : ''
    if (!window.confirm(`Delete ${label}?${warning}`)) return
    try {
      await api(`/${entity === 'field' ? 'fields' : entity === 'crop' ? 'crops' : 'livestock'}/${id}`, { method: 'DELETE' })
      await loadData()
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not delete this record')
    }
  }

  if (!session) return <AuthScreen onAuthenticated={acceptSession} />

  const filteredFields = fields.filter(field => `${field.name} ${field.location ?? ''}`.toLowerCase().includes(query.toLowerCase()))
  const filteredCrops = crops.filter(crop => `${crop.name} ${crop.type ?? ''}`.toLowerCase().includes(query.toLowerCase()))
  const filteredLivestock = livestock.filter(animal => `${animal.type} ${animal.healthStatus ?? ''}`.toLowerCase().includes(query.toLowerCase()))
  const fieldForCrop = (crop: Crop) => fields.find(field => field.id === (crop as Crop & { fieldId?: number }).fieldId)

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand"><span className="brand-mark"><Leaf size={19} /></span><span>fieldnote<span className="brand-period">.</span></span></div>
        <div className="farm-switcher"><div className="farm-avatar"><Tractor size={17} /></div><div><strong>{session.username}'s farm</strong><small>Farm workspace</small></div><ChevronDown size={16} /></div>
        <span className="nav-caption">WORKSPACE</span>
        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map(item => <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => { setView(item.id); setMobileNav(false); setQuery('') }}><item.icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{item.id === 'fields' && fields.length > 0 && <span className="nav-count">{fields.length}</span>}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="season-note"><div className="season-icon"><CalendarDays size={16} /></div><span><b>Farm season</b><small>{new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</small></span><ArrowRight size={14} /></div>
          <div className="profile-row"><div className="profile-avatar">{session.username.slice(0, 1).toUpperCase()}</div><div className="profile-copy"><strong>{session.username}</strong><small>{session.email}</small></div><button className="icon-button profile-logout" title="Sign out" onClick={signOut}><LogOut size={17} /></button></div>
        </div>
      </aside>
      {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}

      <main className="main-panel">
        <header className="topbar">
          <button className="icon-button mobile-menu" title="Open navigation" onClick={() => setMobileNav(true)}><Menu size={20} /></button>
          <div className="breadcrumb"><span>Farm</span><ArrowRight size={13} /><strong>{titleFor[view]}</strong></div>
          <div className="topbar-actions">{view !== 'dashboard' && <label className="search-box"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search this view" /></label>}<span className="today-label">{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span><button className="icon-button help-button" title="Farm tracker information"><CircleHelp size={18} /></button></div>
        </header>
        <div className="content-wrap">
          <div className="page-heading"><div><div className="eyebrow">FARM MANAGEMENT</div><h1>{titleFor[view]}</h1><p>{view === 'dashboard' ? 'A clear view of what is growing and what is coming in.' : sectionSubtitle(view)}</p></div><div className="heading-action">{view === 'fields' && <button className="primary-button" onClick={() => openForm('field')}><Plus size={17} /> Add field</button>}{view === 'crops' && <button className="primary-button" onClick={() => openForm('crop')} disabled={!fields.length}><Plus size={17} /> Add crop</button>}{view === 'livestock' && <button className="primary-button" onClick={() => openForm('livestock')} disabled={!fields.length}><Plus size={17} /> Add record</button>}</div></div>
          {error && <div className="alert-banner" role="alert"><Activity size={17} /><span>{error}</span><button className="icon-button" onClick={() => setError('')} title="Dismiss"><X size={16} /></button></div>}
          {loading && <div className="loading-line"><span /> Syncing farm records</div>}

          {view === 'dashboard' && <DashboardView summary={summary} fields={fields} crops={crops} onAddField={() => openForm('field')} onView={setView} />}
          {view === 'fields' && <FieldsView fields={filteredFields} crops={crops} onEdit={field => openForm('field', { name: field.name, location: field.location ?? '', sizeHectares: String(field.sizeHectares), soilType: field.soilType ?? '' }, field.id)} onDelete={field => void remove('field', field.id, field.name)} onCrops={setView} />}
          {view === 'crops' && <CropsView crops={filteredCrops} fields={fields} harvests={harvests} expenses={expenses} onEdit={crop => openForm('crop', cropForm(crop, fieldForCrop(crop)?.id), crop.id)} onDelete={crop => void remove('crop', crop.id, crop.name)} onHarvest={crop => openForm('harvest', undefined, undefined, crop.id)} onExpense={crop => openForm('expense', undefined, undefined, crop.id)} onAdd={() => openForm('crop')} />}
          {view === 'harvests' && <HarvestsView crops={filteredCrops} harvests={harvests} onAdd={crop => openForm('harvest', undefined, undefined, crop.id)} />}
          {view === 'expenses' && <ExpensesView crops={filteredCrops} expenses={expenses} onAdd={crop => openForm('expense', undefined, undefined, crop.id)} />}
          {view === 'livestock' && <LivestockView livestock={filteredLivestock} fields={fields} onEdit={animal => openForm('livestock', livestockForm(animal, animal.fieldId), animal.id)} onDelete={animal => void remove('livestock', animal.id, animal.type)} />}
        </div>
      </main>
      {form && <RecordDialog form={form} fields={fields} crops={crops} onChange={values => setForm({ ...form, values })} onClose={() => setForm(null)} onSubmit={saveForm} />}
    </div>
  )
}

function sectionSubtitle(view: View) {
  return ({ fields: 'Land, location and soil details in one place.', crops: 'Follow every planting from seed to harvest.', harvests: 'Record yield as crops come in.', expenses: 'Keep crop costs visible and accounted for.', livestock: 'A practical record of the animals on your farm.', dashboard: '' })[view]
}

function cropForm(crop: Crop, fieldId?: number) {
  return { name: crop.name, type: crop.type ?? '', plantingDate: crop.plantingDate ?? '', expectedHarvestDate: crop.expectedHarvestDate ?? '', status: crop.status, fieldId: String(fieldId ?? '') }
}

function livestockForm(animal: Livestock, fieldId?: number) {
  return { type: animal.type, count: String(animal.count), healthStatus: animal.healthStatus ?? '', acquisitionDate: animal.acquisitionDate ?? '', fieldId: String(fieldId ?? '') }
}

function DashboardView({ summary, fields, crops, onAddField, onView }: {
  summary: Dashboard | null; fields: Field[]; crops: Crop[]; onAddField: () => void; onView: (view: View) => void
}) {
  const upcoming = crops.filter(crop => crop.status !== 'HARVESTED' && crop.expectedHarvestDate).sort((a, b) => (a.expectedHarvestDate ?? '').localeCompare(b.expectedHarvestDate ?? '')).slice(0, 4)
  const cropField = (crop: Crop) => fields.find(field => field.id === (crop as Crop & { fieldId?: number }).fieldId)?.name ?? 'Field'
  return <>
    <div className="welcome-strip"><div className="welcome-text"><span className="welcome-kicker"><span className="live-dot" /> SEASON AT A GLANCE</span><h2>Good work starts<br />with a good <em>overview.</em></h2><p>Your farm, measured one field at a time.</p></div><div className="field-illustration" aria-hidden="true"><div className="sun-disc" /><div className="hill hill-back" /><div className="hill hill-front" /><div className="furrow f-one" /><div className="furrow f-two" /><div className="furrow f-three" /><div className="illustration-stem stem-one"><i /><b /></div><div className="illustration-stem stem-two"><i /><b /></div><div className="illustration-stem stem-three"><i /><b /></div></div><div className="welcome-index">FIELDNOTE / 01<br /><span>GROWING TOGETHER</span></div></div>
    <div className="metric-grid"><MetricCard label="Registered fields" value={summary?.fieldCount ?? 0} icon={FieldIcon} accent="sage" note="land in your care" /><MetricCard label="Active crops" value={summary?.activeCropCount ?? 0} icon={Sprout} accent="gold" note="in the ground" /><MetricCard label="Harvested crops" value={summary?.harvestedCropCount ?? 0} icon={Wheat} accent="coral" note="ready in the ledger" /><MetricCard label="Total expenses" value={amount(summary?.totalExpenses)} icon={TrendingUp} accent="blue" note="across all crop cycles" /></div>
    {summary?.noData && <div className="empty-state first-run"><div className="empty-icon"><Sprout size={24} /></div><span className="eyebrow">A FRESH START</span><h3>No data yet</h3><p>Add your first field to begin keeping track of your farm.</p><button className="primary-button" onClick={onAddField}><Plus size={17} /> Add your first field</button></div>}
    {!summary?.noData && <div className="dashboard-grid"><section className="panel crop-summary-panel"><div className="panel-heading"><div><span className="eyebrow">BY CROP</span><h3>Crop performance</h3></div><button className="text-button" onClick={() => onView('crops')}>All crops <ArrowRight size={14} /></button></div>{summary?.crops.length ? <div className="summary-table-wrap"><table className="data-table"><thead><tr><th>Crop</th><th>Field</th><th>Status</th><th>Yield</th><th>Expenses</th></tr></thead><tbody>{summary.crops.map(item => <tr key={item.cropId}><td><span className="crop-name-mark"><Leaf size={14} /></span><strong>{item.cropName}</strong></td><td>{item.fieldName}</td><td><StatusTag status={item.status} /></td><td>{item.totalYield == null ? '—' : `${amount(item.totalYield)} ${item.yieldUnit?.toLowerCase()}`}</td><td>{amount(item.totalExpenses)}</td></tr>)}</tbody></table></div> : <div className="empty-inline"><Sprout size={19} /><span>No crops recorded yet</span><button onClick={() => onView('fields')}>Go to fields <ArrowRight size={13} /></button></div>}</section>
    <section className="panel schedule-panel"><div className="panel-heading"><div><span className="eyebrow">ON THE CALENDAR</span><h3>Coming up</h3></div><span className="calendar-icon"><CalendarDays size={17} /></span></div>{upcoming.length ? <div className="upcoming-list">{upcoming.map(crop => <div className="upcoming-item" key={crop.id}><div className="date-tile"><b>{crop.expectedHarvestDate ? new Date(`${crop.expectedHarvestDate}T00:00:00`).getDate() : '—'}</b><small>{crop.expectedHarvestDate ? new Date(`${crop.expectedHarvestDate}T00:00:00`).toLocaleDateString(undefined, { month: 'short' }).toUpperCase() : ''}</small></div><div className="upcoming-copy"><strong>{crop.name}</strong><span>{cropField(crop)} · Expected harvest</span></div><ArrowRight size={15} /></div>)}</div> : <div className="schedule-empty"><CalendarDays size={20} /><span>No upcoming harvest dates</span></div>}<button className="schedule-link" onClick={() => onView('harvests')}>View harvest records <ArrowRight size={14} /></button></section></div>}
    <div className="dashboard-footer"><span><span className="footer-seed"><Leaf size={13} /></span> Thoughtfully tracking the work behind every harvest.</span><button onClick={() => onView('fields')}>Manage your fields <ArrowRight size={13} /></button></div>
  </>
}

function MetricCard({ label, value, icon: Icon, accent, note }: { label: string; value: string | number; icon: typeof Leaf; accent: string; note: string }) {
  return <article className="metric-card"><div className={`metric-icon ${accent}`}><Icon size={18} strokeWidth={1.8} /></div><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong><span className="metric-note">{note}</span><span className={`metric-corner ${accent}`}><Activity size={13} /></span></article>
}

function FieldsView({ fields, crops, onEdit, onDelete, onCrops }: { fields: Field[]; crops: Crop[]; onEdit: (field: Field) => void; onDelete: (field: Field) => void; onCrops: (view: View) => void }) {
  if (!fields.length) return <EmptyState icon={FieldIcon} title="No fields to show" text="Add a field to start organizing your land and crops." />
  return <section className="panel list-panel"><div className="panel-heading"><div><span className="eyebrow">LAND INVENTORY</span><h3>{fields.length} field{fields.length === 1 ? '' : 's'}</h3></div><span className="table-unit">SIZE · HECTARES</span></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Field</th><th>Location</th><th>Soil type</th><th>Size</th><th>Crop activity</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{fields.map(field => { const count = crops.filter(crop => (crop as Crop & { fieldId?: number }).fieldId === field.id).length; return <tr key={field.id}><td><span className="field-avatar"><FieldIcon size={16} /></span><strong>{field.name}</strong></td><td>{field.location || '—'}</td><td>{field.soilType || '—'}</td><td>{amount(field.sizeHectares)} ha</td><td><button className="table-link" onClick={() => onCrops('crops')}>{count} crop{count === 1 ? '' : 's'} <ArrowRight size={13} /></button></td><td><RowActions onEdit={() => onEdit(field)} onDelete={() => onDelete(field)} /></td></tr> })}</tbody></table></div></section>
}

function CropsView({ crops, fields, harvests, expenses, onEdit, onDelete, onHarvest, onExpense, onAdd }: {
  crops: Crop[]; fields: Field[]; harvests: Record<number, Harvest>; expenses: Record<number, ExpenseList>; onEdit: (crop: Crop) => void; onDelete: (crop: Crop) => void; onHarvest: (crop: Crop) => void; onExpense: (crop: Crop) => void; onAdd: () => void
}) {
  const fieldName = (crop: Crop) => fields.find(field => field.id === (crop as Crop & { fieldId?: number }).fieldId)?.name ?? '—'
  if (!crops.length) return <EmptyState icon={Sprout} title="No crops to show" text={fields.length ? 'Add a crop to begin tracking planting and harvest dates.' : 'Add a field before recording your first crop.'} action={fields.length ? <button className="primary-button" onClick={onAdd}><Plus size={16} /> Add crop</button> : null} />
  return <section className="panel list-panel"><div className="panel-heading"><div><span className="eyebrow">PLANTING REGISTER</span><h3>{crops.length} crop{crops.length === 1 ? '' : 's'}</h3></div><button className="quiet-button" onClick={onAdd}><Plus size={15} /> New crop</button></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Crop</th><th>Field</th><th>Planted</th><th>Expected harvest</th><th>Status</th><th>Spend</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{crops.map(crop => <tr key={crop.id}><td><span className="crop-name-mark"><Leaf size={14} /></span><strong>{crop.name}</strong><small className="cell-subtext">{crop.type || 'Crop'}</small></td><td>{fieldName(crop)}</td><td>{dateLabel(crop.plantingDate)}</td><td>{dateLabel(crop.expectedHarvestDate)}</td><td><StatusTag status={crop.status} /></td><td>{amount(expenses[crop.id]?.total)}</td><td><RowActions onEdit={() => onEdit(crop)} onDelete={() => onDelete(crop)} extra={crop.status !== 'HARVESTED' && !harvests[crop.id] ? <button className="row-icon" title="Record harvest" onClick={() => onHarvest(crop)}><Wheat size={15} /></button> : <button className="row-icon" title="Add expense" onClick={() => onExpense(crop)}><Plus size={16} /></button>} /></td></tr>)}</tbody></table></div></section>
}

function HarvestsView({ crops, harvests, onAdd }: { crops: Crop[]; harvests: Record<number, Harvest>; onAdd: (crop: Crop) => void }) {
  const records = crops.filter(crop => harvests[crop.id])
  const pending = crops.filter(crop => crop.status !== 'HARVESTED' && !harvests[crop.id])
  return <div className="stacked-panels"><section className="panel list-panel"><div className="panel-heading"><div><span className="eyebrow">YIELD REGISTER</span><h3>{records.length} harvest{records.length === 1 ? '' : 's'} recorded</h3></div><span className="calendar-icon"><Wheat size={17} /></span></div>{records.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Crop</th><th>Harvest date</th><th>Yield</th><th>Unit</th></tr></thead><tbody>{records.map(crop => <tr key={crop.id}><td><span className="crop-name-mark"><Wheat size={14} /></span><strong>{crop.name}</strong></td><td>{dateLabel(harvests[crop.id].harvestDate)}</td><td>{amount(harvests[crop.id].yieldQuantity)}</td><td><span className="unit-tag">{harvests[crop.id].unit}</span></td></tr>)}</tbody></table></div> : <div className="empty-inline"><Wheat size={18} /><span>No harvest records yet</span></div>}</section>{pending.length > 0 && <section className="panel pending-panel"><div className="panel-heading"><div><span className="eyebrow">READY TO LOG</span><h3>Harvest a crop</h3></div></div><div className="pending-crops">{pending.map(crop => <div className="pending-crop" key={crop.id}><span className="crop-name-mark"><Sprout size={15} /></span><strong>{crop.name}</strong><StatusTag status={crop.status} /><button className="quiet-button" onClick={() => onAdd(crop)}><Plus size={14} /> Record yield</button></div>)}</div></section>}</div>
}

function ExpensesView({ crops, expenses, onAdd }: { crops: Crop[]; expenses: Record<number, ExpenseList>; onAdd: (crop: Crop) => void }) {
  const items = crops.flatMap(crop => (expenses[crop.id]?.items ?? []).map(expense => ({ ...expense, cropName: crop.name }))).sort((a, b) => b.expenseDate.localeCompare(a.expenseDate))
  const total = items.reduce((sum, item) => sum + item.amount, 0)
  return <div className="stacked-panels"><section className="ledger-total"><div><span className="eyebrow">ALL CROP COSTS</span><strong>{amount(total)}</strong><small>{items.length} expense records</small></div><div className="ledger-mark"><ArrowDownToLine size={23} /></div></section><section className="panel list-panel"><div className="panel-heading"><div><span className="eyebrow">EXPENSE LEDGER</span><h3>Recent activity</h3></div><span className="table-unit">SORTED BY DATE</span></div>{items.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Category</th><th>Crop</th><th>Date</th><th>Amount</th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td><span className="expense-dot" />{categoryLabel(item.category)}</td><td><strong>{item.cropName}</strong></td><td>{dateLabel(item.expenseDate)}</td><td className="amount-cell">{amount(item.amount)}</td></tr>)}</tbody></table></div> : <div className="empty-inline"><ClipboardList size={18} /><span>No expense records yet</span></div>}</section>{crops.length > 0 && <div className="crop-expense-links"><span className="eyebrow">ADD AN EXPENSE</span>{crops.map(crop => <button key={crop.id} className="expense-crop-button" onClick={() => onAdd(crop)}><span><Plus size={14} />{crop.name}</span><ArrowRight size={14} /></button>)}</div>}</div>
}

function LivestockView({ livestock, fields, onEdit, onDelete }: { livestock: Livestock[]; fields: Field[]; onEdit: (animal: Livestock) => void; onDelete: (animal: Livestock) => void }) {
  const fieldName = (animal: Livestock) => fields.find(field => field.id === (animal as Livestock & { fieldId?: number }).fieldId)?.name ?? '—'
  if (!livestock.length) return <EmptyState icon={Beef} title="No livestock records" text={fields.length ? 'Keep a simple record of animals and where they are kept.' : 'Add a field first, then link livestock to it.'} />
  return <section className="panel list-panel"><div className="panel-heading"><div><span className="eyebrow">ANIMAL REGISTER</span><h3>{livestock.reduce((sum, animal) => sum + animal.count, 0)} animals · {livestock.length} record{livestock.length === 1 ? '' : 's'}</h3></div></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Type</th><th>Count</th><th>Field</th><th>Health status</th><th>Acquired</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{livestock.map(animal => <tr key={animal.id}><td><span className="field-avatar animal-avatar"><Beef size={16} /></span><strong>{animal.type}</strong></td><td>{animal.count}</td><td>{fieldName(animal)}</td><td><span className="health-tag"><span />{animal.healthStatus || 'Not specified'}</span></td><td>{dateLabel(animal.acquisitionDate)}</td><td><RowActions onEdit={() => onEdit(animal)} onDelete={() => onDelete(animal)} /></td></tr>)}</tbody></table></div></section>
}

function StatusTag({ status }: { status: CropStatus }) {
  return <span className={`status-tag ${status.toLowerCase()}`}><span />{status[0] + status.slice(1).toLowerCase()}</span>
}

function RowActions({ onEdit, onDelete, extra }: { onEdit: () => void; onDelete: () => void; extra?: React.ReactNode }) {
  return <div className="row-actions">{extra}<button className="row-icon" title="Edit record" onClick={onEdit}><Settings2 size={15} /></button><button className="row-icon danger" title="Delete record" onClick={onDelete}><X size={15} /></button></div>
}

function EmptyState({ icon: Icon, title, text, action }: { icon: typeof Leaf; title: string; text: string; action?: React.ReactNode }) {
  return <div className="empty-state"><div className="empty-icon"><Icon size={22} /></div><h3>{title}</h3><p>{text}</p>{action}</div>
}

function categoryLabel(category: ExpenseCategory) {
  return category.toLowerCase().replace(/\b\w/g, character => character.toUpperCase())
}

function RecordDialog({ form, fields, crops, onChange, onClose, onSubmit }: {
  form: { entity: Entity; id?: number; cropId?: number; values: Record<string, string> }; fields: Field[]; crops: Crop[]; onChange: (values: Record<string, string>) => void; onClose: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  const { entity, id, cropId, values } = form
  const crop = crops.find(item => item.id === cropId)
  const heading = `${id ? 'Edit' : 'Add'} ${entity}`
  function update(key: string, value: string) { onChange({ ...values, [key]: value }) }
  return <div className="dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section className="record-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header className="dialog-heading"><div><span className="eyebrow">FARM RECORD</span><h2 id="dialog-title">{heading}</h2>{crop && <p>For <strong>{crop.name}</strong></p>}</div><button className="icon-button" onClick={onClose} title="Close dialog"><X size={19} /></button></header><form onSubmit={onSubmit} className="record-form">
    {entity === 'field' && <><TextField label="Field name" name="name" value={values.name} onChange={update} required /><TextField label="Location" name="location" value={values.location} onChange={update} placeholder="Village, district or coordinates" /><div className="form-two"><TextField label="Size (hectares)" name="sizeHectares" value={values.sizeHectares} onChange={update} type="number" min="0.01" step="0.01" required /><TextField label="Soil type" name="soilType" value={values.soilType} onChange={update} placeholder="e.g. Loam" /></div></>}
    {entity === 'crop' && <>{!id && <SelectField label="Field" name="fieldId" value={values.fieldId} onChange={update} required options={fields.map(field => [String(field.id), field.name])} />}{id && <TextField label="Crop name" name="name" value={values.name} onChange={update} required />}{!id && <TextField label="Crop name" name="name" value={values.name} onChange={update} required />}<TextField label="Crop type" name="type" value={values.type} onChange={update} placeholder="e.g. Hybrid maize" /><div className="form-two"><TextField label="Planting date" name="plantingDate" value={values.plantingDate} onChange={update} type="date" /><TextField label="Expected harvest" name="expectedHarvestDate" value={values.expectedHarvestDate} onChange={update} type="date" /></div><SelectField label="Status" name="status" value={values.status} onChange={update} options={[["PLANTED", "Planted"], ["GROWING", "Growing"], ["HARVESTED", "Harvested"]]} /></>}
    {entity === 'harvest' && <><div className="form-two"><TextField label="Harvest date" name="harvestDate" value={values.harvestDate} onChange={update} type="date" required /><TextField label="Yield quantity" name="yieldQuantity" value={values.yieldQuantity} onChange={update} type="number" min="0.01" step="0.01" required /></div><SelectField label="Yield unit" name="unit" value={values.unit} onChange={update} options={[["KG", "Kilograms"], ["TONS", "Tons"], ["BAGS", "Bags"]]} /></>}
    {entity === 'expense' && <><SelectField label="Category" name="category" value={values.category} onChange={update} options={[["SEEDS", "Seeds"], ["FERTILIZER", "Fertilizer"], ["LABOR", "Labor"], ["EQUIPMENT", "Equipment"]]} /><div className="form-two"><TextField label="Amount" name="amount" value={values.amount} onChange={update} type="number" min="0.01" step="0.01" required /><TextField label="Date" name="expenseDate" value={values.expenseDate} onChange={update} type="date" required /></div></>}
    {entity === 'livestock' && <><TextField label="Animal type" name="type" value={values.type} onChange={update} placeholder="e.g. Dairy cattle" required /><div className="form-two"><TextField label="Count" name="count" value={values.count} onChange={update} type="number" min="0" step="1" required /><SelectField label="Field" name="fieldId" value={values.fieldId} onChange={update} required options={fields.map(field => [String(field.id), field.name])} /></div><div className="form-two"><TextField label="Health status" name="healthStatus" value={values.healthStatus} onChange={update} placeholder="e.g. Healthy" /><TextField label="Acquisition date" name="acquisitionDate" value={values.acquisitionDate} onChange={update} type="date" /></div></>}
    <div className="dialog-actions"><button type="button" className="quiet-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit"><Check size={16} /> Save {entity}</button></div>
  </form></section></div>
}

function TextField({ label, name, value, onChange, type = 'text', placeholder, required, min, step }: {
  label: string; name: string; value: string; onChange: (name: string, value: string) => void; type?: string; placeholder?: string; required?: boolean; min?: string; step?: string
}) {
  return <label className="form-field"><span>{label}{required && <i> *</i>}</span><input name={name} type={type} value={value ?? ''} placeholder={placeholder} required={required} min={min} step={step} onChange={event => onChange(name, event.target.value)} /></label>
}

function SelectField({ label, name, value, onChange, options, required }: {
  label: string; name: string; value: string; onChange: (name: string, value: string) => void; options: [string, string][]; required?: boolean
}) {
  return <label className="form-field"><span>{label}{required && <i> *</i>}</span><select name={name} value={value ?? ''} required={required} onChange={event => onChange(name, event.target.value)}><option value="" disabled>Select {label.toLowerCase()}</option>{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (session: Session) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [values, setValues] = useState({ username: '', email: '', identifier: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await api<Session>(mode === 'register' ? '/auth/register' : '/auth/login', jsonBody(mode === 'register'
        ? { username: values.username, email: values.email, password: values.password }
        : { identifier: values.identifier, password: values.password }))
      if (mode === 'register') {
        setMode('login')
        setValues({ username: '', email: '', identifier: response.username, password: '' })
        setError('Account created. Sign in to open your farm workspace.')
      } else onAuthenticated(response)
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Authentication failed')
    } finally {
      setBusy(false)
    }
  }
  return <main className="auth-screen"><section className="auth-story"><div className="auth-brand"><span className="brand-mark"><Leaf size={19} /></span>fieldnote<span className="brand-period">.</span></div><div className="auth-story-copy"><span className="welcome-kicker"><span className="live-dot" /> A BETTER VIEW OF YOUR FARM</span><h1>Rooted in the<br />work. Ready for<br /><em>what's next.</em></h1><p>Bring your fields, crops and harvest into one thoughtful workspace.</p></div><div className="auth-story-art"><div className="auth-sun" /><div className="auth-field field-a" /><div className="auth-field field-b" /><div className="auth-field field-c" /><span className="auth-plant p-a"><i /><b /></span><span className="auth-plant p-b"><i /><b /></span></div><div className="auth-footnote">FIELDNOTE / KEEP GROWING</div></section><section className="auth-form-side"><div className="auth-form-wrap"><div className="auth-mobile-brand"><span className="brand-mark"><Leaf size={18} /></span>fieldnote<span className="brand-period">.</span></div><span className="eyebrow">YOUR FARM WORKSPACE</span><h2>{mode === 'login' ? 'Welcome back.' : 'Start your farm record.'}</h2><p className="auth-subtitle">{mode === 'login' ? 'Sign in to pick up where you left off.' : 'A few details and you’re ready to begin.'}</p><div className="auth-tabs"><button className={mode === 'login' ? 'selected' : ''} onClick={() => { setMode('login'); setError('') }}>Sign in</button><button className={mode === 'register' ? 'selected' : ''} onClick={() => { setMode('register'); setError('') }}>Create account</button></div>{error && <div className={error.startsWith('Account created') ? 'auth-success' : 'auth-error'} role="alert">{error}</div>}<form onSubmit={submit} className="auth-form">{mode === 'register' ? <><TextField label="Username" name="username" value={values.username} onChange={(name, value) => setValues({ ...values, [name]: value })} required /><TextField label="Email address" name="email" value={values.email} onChange={(name, value) => setValues({ ...values, [name]: value })} type="email" required /></> : <TextField label="Username or email" name="identifier" value={values.identifier} onChange={(name, value) => setValues({ ...values, [name]: value })} required />}<TextField label="Password" name="password" value={values.password} onChange={(name, value) => setValues({ ...values, [name]: value })} type="password" required />{mode === 'register' && <small className="password-hint">Use at least 8 characters.</small>}<button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in to your farm' : 'Create your account'}<ArrowRight size={17} /></button></form><div className="auth-bottom-note"><span><Check size={14} /> Secure, private farm records</span><span>Built for the growing season</span></div></div><div className="auth-copyright">© {new Date().getFullYear()} Fieldnote <span>·</span> Farm management tracker</div></section></main>
}

export default App