import { type ReactNode, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Activity, AlertTriangle, BarChart3, BrainCircuit, Check, ChevronRight, CircleHelp, ClipboardList, Database, Download, FileSpreadsheet, FileUp, Filter, HeartPulse, Info, Layers3, LineChart, ListChecks, Menu, Network, Play, RefreshCw, Search, ShieldCheck, SlidersHorizontal, Sparkles, Table2, Target, Upload, UserRound, UsersRound, X } from 'lucide-react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

type Prediction = { id: string; patient: string; disease: string; confidence: number; risk: string; model: string; date: string };
type Row = Record<string, string>;

const seedRows: Row[] = [
  { Patient_ID: 'PT-1048', Age: '58', Gender: 'Female', Blood_Pressure: '148/92', Sugar_Level: '128', Cholesterol: '232', Disease: 'Hypertension' },
  { Patient_ID: 'PT-1049', Age: '41', Gender: 'Male', Blood_Pressure: '124/78', Sugar_Level: '96', Cholesterol: '184', Disease: 'Healthy' },
  { Patient_ID: 'PT-1050', Age: '67', Gender: 'Female', Blood_Pressure: '156/98', Sugar_Level: '141', Cholesterol: '248', Disease: 'Diabetes' },
  { Patient_ID: 'PT-1051', Age: '35', Gender: 'Male', Blood_Pressure: '118/76', Sugar_Level: '88', Cholesterol: '172', Disease: 'Healthy' },
  { Patient_ID: 'PT-1052', Age: '52', Gender: 'Female', Blood_Pressure: '138/86', Sugar_Level: '112', Cholesterol: '219', Disease: 'Heart Disease' },
];

const seedPredictions: Prediction[] = [
  { id: 'PD-8821', patient: 'PT-1048', disease: 'Hypertension', confidence: 87, risk: 'Moderate', model: 'Random Forest', date: 'Today, 10:42' },
  { id: 'PD-8820', patient: 'PT-1050', disease: 'Diabetes', confidence: 81, risk: 'Elevated', model: 'Random Forest', date: 'Today, 09:18' },
  { id: 'PD-8819', patient: 'PT-1049', disease: 'Healthy', confidence: 94, risk: 'Low', model: 'Logistic Regression', date: 'Yesterday, 16:27' },
  { id: 'PD-8818', patient: 'PT-1052', disease: 'Heart Disease', confidence: 76, risk: 'Moderate', model: 'Decision Tree', date: 'Yesterday, 14:03' },
];

const modelRows = [
  { name: 'Random Forest', mark: 'RF', detail: 'Ensemble of decision trees', accuracy: 91.8, precision: 89.7, recall: 90.4, f1: 90.0 },
  { name: 'Logistic Regression', mark: 'LR', detail: 'Linear probability baseline', accuracy: 87.4, precision: 85.8, recall: 84.1, f1: 84.9 },
  { name: 'Decision Tree', mark: 'DT', detail: 'Interpretable rule-based model', accuracy: 85.6, precision: 83.1, recall: 86.7, f1: 84.9 },
  { name: 'Naive Bayes', mark: 'NB', detail: 'Probabilistic feature model', accuracy: 82.9, precision: 81.4, recall: 80.8, f1: 81.1 },
  { name: 'SVM', mark: 'SV', detail: 'Margin-based classifier', accuracy: 88.6, precision: 87.2, recall: 85.9, f1: 86.5 },
];

const diseaseData = [
  { name: 'Healthy', value: 34, color: '#277b77' },
  { name: 'Hypertension', value: 25, color: '#6e9ed5' },
  { name: 'Diabetes', value: 20, color: '#e5aa59' },
  { name: 'Heart Disease', value: 11, color: '#ae8cca' },
  { name: 'Other', value: 10, color: '#dbe4e5' },
];

const navItems = [
  { href: '/', label: 'Overview', icon: BarChart3 },
  { href: '/dataset', label: 'Dataset', icon: Database },
  { href: '/analysis', label: 'Analysis', icon: LineChart },
  { href: '/models', label: 'Models', icon: BrainCircuit },
  { href: '/prediction', label: 'Prediction', icon: Target },
  { href: '/results', label: 'Results', icon: ClipboardList },
];

function initials(value: string) {
  return value.split(' ').map((part) => part[0]).join('').slice(0, 2);
}

function Badge({ children, tone = 'green' }: { children: ReactNode; tone?: 'green' | 'blue' | 'amber' | 'red' }) {
  return <span className={`tag tag-${tone}`}>{children}</span>;
}

function SafetyDisclaimer() {
  return <div className="disclaimer" data-testid="disclaimer-clinical-safety"><AlertTriangle /><span><strong>Decision-support only.</strong> These outputs are educational estimates from a demonstration model, not a medical diagnosis. A qualified clinician remains responsible for interpretation, validation, and care decisions.</span></div>;
}

function Shell({ children, onToast }: { children: ReactNode; onToast: (message: string) => void }) {
  const [location] = useLocation();
  const current = navItems.find((item) => item.href === location) ?? navItems[0];
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand">
         <div className="brand-mark"><img src={`${import.meta.env.BASE_URL}disease-icon.png`} alt="" /></div>
        <div className="brand-copy"><strong>Disease Prediction</strong><span>Analytics lab</span></div>
      </div>
      <div className="nav-label">Workspace</div>
      <nav className="nav-list" aria-label="Primary navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          return <Link key={item.href} href={item.href} className={`nav-item ${location === item.href ? 'active' : ''}`} data-testid={`link-nav-${item.label.toLowerCase()}`}><Icon /><span>{item.label}</span></Link>;
        })}
      </nav>
      <div className="sidebar-bottom">
        <div className="signal-card">
          <div className="signal-row"><span className="signal-dot" /> Demo workspace healthy</div>
          <p>Seeded data is active. No patient records leave this browser session.</p>
        </div>
      </div>
    </aside>
    <section className="workspace">
      <header className="topbar">
        <div className="crumb"><span>Workspace / </span><strong>{current.label}</strong></div>
        <div className="top-actions">
          <button className="icon-btn" title="Help and methodology" onClick={() => onToast('Methodology notes are available in the viva brief.')} data-testid="button-help"><CircleHelp /></button>
          <button className="icon-btn" title="Refresh demo data" onClick={() => onToast('Demo workspace refreshed.')} data-testid="button-refresh"><RefreshCw /></button>
          <div className="avatar" title="Student analyst">SA</div>
        </div>
      </header>
      <main className="main">{children}</main>
    </section>
  </div>;
}

function PageIntro({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode }) {
  return <div className="page-intro"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="subtitle">{subtitle}</p></div>{action}</div>;
}

function MetricCard({ icon: Icon, label, value, note, good = false }: { icon: typeof Activity; label: string; value: string; note: string; good?: boolean }) {
  return <div className="metric-card" data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}><div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon /></span></div><div className="metric-value">{value}</div><div className={`metric-note ${good ? 'good' : ''}`}>{note}</div></div>;
}

function Overview({ onToast }: { onToast: (message: string) => void }) {
  return <div>
    <PageIntro eyebrow="Workspace overview" title="Good morning, analyst." subtitle="A compact view of dataset health, model behavior, and the latest transparent predictions." action={<Link href="/prediction" className="btn btn-primary" data-testid="link-new-prediction"><Sparkles /> New prediction <ChevronRight /></Link>} />
    <div className="grid metrics-grid">
      <MetricCard icon={UsersRound} label="Patient records" value="1,248" note="+84 records this month" good />
      <MetricCard icon={ShieldCheck} label="Dataset quality" value="96.2%" note="Within accepted threshold" good />
      <MetricCard icon={BrainCircuit} label="Active model" value="91.8%" note="Random Forest · v2.4" good />
      <MetricCard icon={Activity} label="Predictions run" value="376" note="28 in the last 7 days" />
    </div>
    <div className="grid split-grid">
      <section className="panel lens-panel">
        <div className="panel-heading"><div><h2>Model lens</h2><p>Validation performance across the active evaluation window.</p></div><Badge tone="green"><Check /> Verified</Badge></div>
        <div className="lens-metric"><strong>91.8%</strong><span>balanced accuracy<br />on held-out records</span></div>
        <div className="sparkline">{[35,42,28,49,40,57,50,67,60,73,69,82].map((height, index) => <i key={index} style={{ height: `${height}%`, animationDelay: `${index * 35}ms` }} />)}</div>
        <div className="lens-foot"><span>Jan 08</span><span>Validation trend · 12 runs</span><span>Feb 16</span></div>
      </section>
      <section className="panel">
        <div className="panel-heading"><div><h2>Disease distribution</h2><p>Target classes in the active dataset.</p></div><button className="btn btn-quiet" onClick={() => onToast('Distribution view opened in Analysis.')} data-testid="button-view-distribution">View analysis <ChevronRight /></button></div>
        <div className="bar-list">{diseaseData.slice(0, 4).map((item) => <div className="bar-line" key={item.name}><span>{item.name}</span><div className="bar-track"><div className="bar-fill" style={{ width: `${item.value / 34 * 100}%`, background: item.color }} /></div><strong>{item.value}%</strong></div>)}</div>
        <div style={{ marginTop: 22 }} className="small-note">Healthy records remain the largest class; monitor balance before retraining.</div>
      </section>
    </div>
    <div className="grid two-panel">
      <section className="panel">
        <div className="panel-heading"><div><h2>Recent prediction activity</h2><p>Latest browser-side demo inferences.</p></div><Link href="/results" className="btn btn-quiet" data-testid="link-view-all-results">View all <ChevronRight /></Link></div>
        <PredictionTable rows={seedPredictions.slice(0, 3)} />
      </section>
      <section className="panel">
        <div className="panel-heading"><div><h2>Dataset health</h2><p>Quality checks from the active file.</p></div><Badge tone="green">Healthy</Badge></div>
        <div className="quality-score"><div className="score-ring"><strong>96%</strong></div><div className="quality-text"><strong>Ready for analysis</strong><span>Low missingness, stable labels, and no duplicate patient IDs detected.</span></div></div>
        <div className="info-list" style={{ marginTop: 22 }}><div className="info-row"><span>Completeness</span><strong>98.4%</strong></div><div className="info-row"><span>Duplicate rows</span><strong>0.2%</strong></div><div className="info-row"><span>Last cleaned</span><strong>Today, 08:34</strong></div></div>
      </section>
    </div>
    <div style={{ marginTop: 16 }}><SafetyDisclaimer /></div>
  </div>;
}

function PredictionTable({ rows }: { rows: Prediction[] }) {
  if (!rows.length) return <div className="empty-state"><ClipboardList size={22} /><strong>No predictions yet</strong><span>Run a patient prediction to populate this activity feed.</span></div>;
  return <div className="table-wrap"><table><thead><tr><th>Patient</th><th>Probable disease</th><th>Confidence</th><th>Risk</th><th>When</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><div className="patient"><span className="patient-avatar">{initials(row.patient)}</span>{row.patient}</div></td><td>{row.disease}</td><td><span className="mono">{row.confidence}%</span></td><td><Badge tone={row.risk === 'Low' ? 'green' : row.risk === 'Elevated' ? 'red' : 'amber'}>{row.risk}</Badge></td><td className="small-note">{row.date}</td></tr>)}</tbody></table></div>;
}

function DatasetPage({ rows, setRows, onToast }: { rows: Row[]; setRows: (rows: Row[]) => void; onToast: (message: string) => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState('preview');
  const [datasetName, setDatasetName] = useState('clinical_cohort_v2.csv');
  const [uploadState, setUploadState] = useState('Ready');
  const columns = rows.length ? Object.keys(rows[0]) : [];
  const handleFile = (file?: File) => {
    if (!file) return;
    setDatasetName(file.name);
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension === 'csv') {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? '');
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length > 1) {
          const headers = lines[0].split(',').map((header) => header.trim().replaceAll('"', ''));
          const parsed = lines.slice(1, 101).map((line) => {
            const values = line.split(',').map((value) => value.trim().replaceAll('"', ''));
            return headers.reduce<Row>((acc, header, index) => ({ ...acc, [header]: values[index] ?? '' }), {});
          });
          setRows(parsed);
          setUploadState(`Loaded ${parsed.length} preview rows`);
          onToast('CSV parsed and set as active dataset.');
        } else setUploadState('CSV did not contain any data rows');
      };
      reader.readAsText(file);
    } else {
      setUploadState('File accepted · Excel preview stays in demo schema');
      onToast('Excel file accepted. Demo mode keeps the seeded preview schema.');
    }
  };
  return <div>
    <PageIntro eyebrow="Data foundation" title="Dataset upload & cleaning" subtitle="Load a cohort, inspect its shape, and make quality visible before any model sees it." action={<button className="btn btn-primary" onClick={() => fileInput.current?.click()} data-testid="button-upload-dataset"><Upload /> Upload dataset</button>} />
    <input ref={fileInput} className="hidden-input" type="file" accept=".csv,.xlsx,.xls" onChange={(event) => handleFile(event.target.files?.[0])} data-testid="input-dataset-file" />
    <div className="grid split-grid">
      <section className="panel">
        <div className="panel-heading"><div><h2>Bring in a dataset</h2><p>CSV and Excel files are accepted for this browser-side demonstration.</p></div><FileSpreadsheet size={20} color="#4d9288" /></div>
        <div className="dropzone" onClick={() => fileInput.current?.click()} role="button" tabIndex={0} data-testid="dropzone-dataset"><FileUp /><strong>Drop a file here, or browse</strong><span>Recommended: one row per patient · max 25 MB</span><button className="btn btn-secondary" onClick={(event) => { event.stopPropagation(); fileInput.current?.click(); }} data-testid="button-browse-files">Browse files</button></div>
        <div className="panel-footer"><span className="helper"><strong>{datasetName}</strong><br />{rows.length ? `${rows.length.toLocaleString()} active preview records` : 'No rows loaded'}</span><Badge tone={uploadState.includes('Loaded') || uploadState === 'Ready' ? 'green' : 'amber'}>{uploadState}</Badge></div>
      </section>
      <section className="panel">
        <div className="panel-heading"><div><h2>Active dataset</h2><p>The source currently used by analysis and training.</p></div><button className="icon-btn" title="Refresh quality checks" onClick={() => onToast('Quality checks recalculated.')} data-testid="button-refresh-quality"><RefreshCw /></button></div>
        <div className="info-list"><div className="info-row"><span>Dataset</span><strong className="mono">{datasetName}</strong></div><div className="info-row"><span>Rows</span><strong>{rows.length.toLocaleString()}</strong></div><div className="info-row"><span>Features</span><strong>{columns.length || 7}</strong></div><div className="info-row"><span>Target</span><strong>Disease</strong></div><div className="info-row"><span>Last cleaned</span><strong>Today, 08:34</strong></div></div>
        <div style={{ marginTop: 20 }} className="quality-score"><div className="score-ring"><strong>96%</strong></div><div className="quality-text"><strong>Quality score</strong><span>Ready for model training with two low-risk missingness flags.</span></div></div>
      </section>
    </div>
    <section className="panel" style={{ marginTop: 16 }}>
      <div className="panel-heading"><div><h2>Schema & preview</h2><p>Review types and raw values before cleaning decisions are applied.</p></div><div className="dataset-tabs"><button className={`tab ${tab === 'preview' ? 'active' : ''}`} onClick={() => setTab('preview')} data-testid="tab-preview">Row preview</button><button className={`tab ${tab === 'schema' ? 'active' : ''}`} onClick={() => setTab('schema')} data-testid="tab-schema">Schema</button></div></div>
      {tab === 'schema' ? <div className="schema-grid">{(columns.length ? columns : ['Patient_ID', 'Age', 'Gender', 'Blood_Pressure', 'Sugar_Level', 'Cholesterol', 'Disease']).map((column, index) => <div className="schema-cell" key={column}><div className="mono">{column}</div><span>{index === 0 || column === 'Disease' ? 'categorical' : index === 2 ? 'categorical' : 'numeric'}</span></div>)}</div> : <div className="table-wrap"><table><thead><tr>{columns.map((column) => <th key={column}>{column.replaceAll('_', ' ')}</th>)}</tr></thead><tbody>{rows.slice(0, 5).map((row, index) => <tr key={`${row.Patient_ID ?? 'row'}-${index}`}>{columns.map((column) => <td key={column}>{row[column]}</td>)}</tr>)}</tbody></table></div>}
      <div className="panel-footer"><span className="helper"><Info size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} /> Preview is capped at 5 rows for readability. Full file remains local to this session.</span><button className="btn btn-secondary" onClick={() => onToast('Cleaning suggestions are already reflected in the quality score.')} data-testid="button-review-cleaning"><SlidersHorizontal /> Review cleaning</button></div>
    </section>
  </div>;
}

function AnalysisPage() {
  const ages = [24, 32, 45, 58, 61, 74, 68, 49, 53, 38, 41, 65];
  return <div>
    <PageIntro eyebrow="Evidence view" title="Understand the cohort." subtitle="Explore target balance, risk factor shape, and demographic coverage without losing the context behind each chart." action={<button className="btn btn-secondary" onClick={() => window.print()} data-testid="button-export-analysis"><Download /> Export analysis</button>} />
    <div className="grid split-grid">
      <section className="panel"><div className="panel-heading"><div><h2>Disease distribution</h2><p>Share of labeled records in the active dataset.</p></div><Badge tone="blue">n = 1,248</Badge></div><div className="donut-wrap"><div className="donut"><div className="donut-center"><strong>5</strong><span>classes</span></div></div><div className="legend">{diseaseData.map((item) => <div className="legend-item" key={item.name}><span className="legend-name"><i className="legend-dot" style={{ background: item.color }} />{item.name}</span><strong>{item.value}%</strong></div>)}</div></div></section>
      <section className="panel"><div className="panel-heading"><div><h2>Age distribution</h2><p>Patient count by age band.</p></div><Badge tone="green">Median 49</Badge></div><div className="histogram">{ages.map((height, index) => <div className="hist-bar" key={index} style={{ height: `${height}%` }} title={`${height} records`} />)}</div><div className="hist-labels"><span>18–29</span><span>30–39</span><span>40–49</span><span>50–59</span><span>60–69</span><span>70+</span></div></section>
    </div>
    <div className="grid two-panel">
      <section className="panel"><div className="panel-heading"><div><h2>Risk factor distributions</h2><p>Median value and observed range.</p></div><Filter size={18} color="#6d8990" /></div><div className="bar-list"><div className="bar-line"><span>Blood pressure</span><div className="bar-track"><div className="bar-fill" style={{ width: '72%' }} /></div><strong>138/86</strong></div><div className="bar-line"><span>Sugar level</span><div className="bar-track"><div className="bar-fill" style={{ width: '48%' }} /></div><strong>112</strong></div><div className="bar-line"><span>Cholesterol</span><div className="bar-track"><div className="bar-fill" style={{ width: '64%' }} /></div><strong>208</strong></div><div className="bar-line"><span>Family history</span><div className="bar-track"><div className="bar-fill" style={{ width: '36%' }} /></div><strong>36%</strong></div></div></section>
      <section className="panel"><div className="panel-heading"><div><h2>Gender breakdown</h2><p>Coverage across the labeled cohort.</p></div><UsersRound size={19} color="#6d8990" /></div><div className="gender-grid"><div className="gender-row"><span>Female</span><div className="bar-track"><div className="bar-fill" style={{ width: '56%' }} /></div><strong>56%</strong></div><div className="gender-row"><span>Male</span><div className="bar-track"><div className="bar-fill" style={{ width: '42%' }} /></div><strong>42%</strong></div><div className="gender-row"><span>Other</span><div className="bar-track"><div className="bar-fill" style={{ width: '2%' }} /></div><strong>2%</strong></div></div><div className="panel-footer"><span className="helper">Gender is descriptive context, not a causal feature.</span><Badge tone="amber">Review bias</Badge></div></section>
    </div>
    <div style={{ marginTop: 16 }} className="panel"><div className="panel-heading"><div><h2>Interpretation note</h2><p>What this view is designed to surface.</p></div><Info size={19} color="#6d8990" /></div><div className="info-list"><div className="info-row"><span>Largest class</span><strong>Healthy · 34% of records</strong></div><div className="info-row"><span>Potential imbalance</span><strong>Heart Disease · 11% of records</strong></div><div className="info-row"><span>Most visible signal</span><strong>Blood pressure and sugar level</strong></div></div></div>
  </div>;
}

function ModelsPage({ onToast }: { onToast: (message: string) => void }) {
  const [selected, setSelected] = useState('Random Forest');
  const [trained, setTrained] = useState(true);
  const [metric, setMetric] = useState<keyof typeof modelRows[number]>('accuracy');
  const train = () => { setTrained(false); window.setTimeout(() => { setTrained(true); onToast(`${selected} training complete on the active dataset.`); }, 700); };
  return <div>
    <PageIntro eyebrow="Model laboratory" title="Train with a clear baseline." subtitle="Select an approach, run the deterministic demo training step, and compare performance on the same held-out cohort." action={<button className="btn btn-primary" onClick={train} disabled={!trained} data-testid="button-train-model"><Play /> {trained ? 'Train selected model' : 'Training…'}</button>} />
    <section className="panel"><div className="panel-heading"><div><h2>Choose a model</h2><p>Each card represents a familiar classification strategy for viva discussion.</p></div><div className="training-state">{trained ? <><Check /> Evaluation ready</> : <><RefreshCw /> Fitting model</>}</div></div><div className="model-grid">{modelRows.map((model) => <button className={`model-card ${selected === model.name ? 'selected' : ''}`} key={model.name} onClick={() => setSelected(model.name)} data-testid={`button-model-${model.mark.toLowerCase()}`}><span className="model-mark">{model.mark}</span><strong>{model.name}</strong><span>{model.detail}</span></button>)}</div></section>
    <section className="panel metric-table"><div className="panel-heading"><div><h2>Model comparison</h2><p>Held-out evaluation metrics · values are deterministic demo outputs.</p></div><div className="filter-row">{(['accuracy', 'precision', 'recall', 'f1'] as const).map((item) => <button key={item} className={`filter-chip ${metric === item ? 'active' : ''}`} onClick={() => setMetric(item)} data-testid={`button-metric-${item}`}>{item === 'f1' ? 'F1-score' : item[0].toUpperCase() + item.slice(1)}</button>)}</div></div><div className="table-wrap"><table><thead><tr><th>Model</th><th>Accuracy</th><th>Precision</th><th>Recall</th><th>F1-score</th><th>Selected</th></tr></thead><tbody>{modelRows.map((model) => <tr key={model.name}><td><div className="patient"><span className="patient-avatar">{model.mark}</span>{model.name}</div></td><td><span className={`score-cell ${metric === 'accuracy' && model.accuracy === 91.8 ? 'best' : ''}`}>{model.accuracy.toFixed(1)}%</span></td><td><span className={`score-cell ${metric === 'precision' && model.precision === 89.7 ? 'best' : ''}`}>{model.precision.toFixed(1)}%</span></td><td><span className={`score-cell ${metric === 'recall' && model.recall === 90.4 ? 'best' : ''}`}>{model.recall.toFixed(1)}%</span></td><td><span className={`score-cell ${metric === 'f1' && model.f1 === 90 ? 'best' : ''}`}>{model.f1.toFixed(1)}%</span></td><td>{selected === model.name ? <Badge tone="green"><Check /> Active</Badge> : <button className="btn btn-quiet" onClick={() => setSelected(model.name)} data-testid={`button-select-${model.mark.toLowerCase()}`}>Use model</button>}</td></tr>)}</tbody></table></div><div className="panel-footer"><span className="helper"><Network size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} /> Compare metrics as evidence, not as a substitute for clinical validation.</span><Badge tone="blue">Metric: {metric === 'f1' ? 'F1-score' : metric}</Badge></div></section>
    <div style={{ marginTop: 16 }}><SafetyDisclaimer /></div>
  </div>;
}

function PredictionPage({ predictions, setPredictions, onToast }: { predictions: Prediction[]; setPredictions: (predictions: Prediction[]) => void; onToast: (message: string) => void }) {
  const [form, setForm] = useState({ patient: 'PT-1062', age: '54', gender: 'Female', symptoms: 'Headache, fatigue, increased thirst', bloodPressure: '146/90', sugar: '132', cholesterol: '226', history: 'Family history of hypertension' });
  const [result, setResult] = useState<Prediction | null>(null);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const runPrediction = () => {
    const age = Number(form.age) || 0;
    const sugar = Number(form.sugar) || 0;
    const bp = Number(form.bloodPressure.split('/')[0]) || 0;
    const disease = sugar > 128 ? 'Diabetes' : bp > 140 ? 'Hypertension' : age > 60 ? 'Heart Disease' : 'Healthy';
    const confidence = Math.min(96, Math.max(71, 68 + Math.round((age % 9) + (sugar > 128 ? 11 : 5) + (bp > 140 ? 8 : 3))));
    const risk = confidence > 88 ? 'Elevated' : confidence > 78 ? 'Moderate' : 'Low';
    const next = { id: `PD-${8822 + predictions.length}`, patient: form.patient || 'PT-NEW', disease, confidence, risk, model: 'Random Forest', date: 'Just now' };
    setResult(next);
    setPredictions([next, ...predictions]);
    onToast('Prediction generated from the active demo model.');
  };
  const factors = result?.disease === 'Diabetes' ? ['Sugar level above cohort median', 'Reported increased thirst', 'Age-adjusted risk signal'] : result?.disease === 'Hypertension' ? ['Systolic pressure above 140', 'Family history noted', 'Cholesterol above median'] : ['No dominant risk factor crossed threshold', 'Values align with healthy cohort range'];
  return <div>
    <PageIntro eyebrow="Transparent inference" title="Generate a probable disease." subtitle="Enter a small patient profile to see how the demo model connects input signals to a cautious, reviewable output." />
    <div className="grid prediction-layout">
      <section className="panel">
        <div className="panel-heading"><div><h2>Patient profile</h2><p>All fields stay in this browser session for the demonstration.</p></div><Badge tone="blue">RF · v2.4</Badge></div>
        <div className="form-grid">
          <div className="field"><label htmlFor="patient-id">Patient ID</label><input id="patient-id" className="input" value={form.patient} onChange={(event) => update('patient', event.target.value)} data-testid="input-patient-id" /></div>
          <div className="field"><label htmlFor="patient-age">Age</label><input id="patient-age" className="input" type="number" value={form.age} onChange={(event) => update('age', event.target.value)} data-testid="input-age" /></div>
          <div className="field"><label htmlFor="patient-gender">Gender</label><select id="patient-gender" className="select" value={form.gender} onChange={(event) => update('gender', event.target.value)} data-testid="select-gender"><option>Female</option><option>Male</option><option>Other</option><option>Prefer not to say</option></select></div>
          <div className="field"><label htmlFor="blood-pressure">Blood pressure</label><input id="blood-pressure" className="input" placeholder="e.g. 128/82" value={form.bloodPressure} onChange={(event) => update('bloodPressure', event.target.value)} data-testid="input-blood-pressure" /></div>
          <div className="field"><label htmlFor="sugar-level">Sugar level <span className="small-note">mg/dL</span></label><input id="sugar-level" className="input" type="number" value={form.sugar} onChange={(event) => update('sugar', event.target.value)} data-testid="input-sugar-level" /></div>
          <div className="field"><label htmlFor="cholesterol">Cholesterol <span className="small-note">mg/dL</span></label><input id="cholesterol" className="input" type="number" value={form.cholesterol} onChange={(event) => update('cholesterol', event.target.value)} data-testid="input-cholesterol" /></div>
          <div className="field full"><label htmlFor="symptoms">Symptoms</label><textarea id="symptoms" className="textarea" value={form.symptoms} onChange={(event) => update('symptoms', event.target.value)} data-testid="input-symptoms" /></div>
          <div className="field full"><label htmlFor="history">Medical history</label><textarea id="history" className="textarea" value={form.history} onChange={(event) => update('history', event.target.value)} data-testid="input-medical-history" /></div>
        </div>
        <div className="panel-footer"><span className="helper"><ShieldCheck size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} /> No identifying details are required beyond the local patient ID.</span><button className="btn btn-primary" onClick={runPrediction} data-testid="button-generate-prediction"><Sparkles /> Generate prediction</button></div>
      </section>
      <section className="panel prediction-result">
        <div className="panel-heading"><div><h2>Prediction reading</h2><p>Evidence attached to the latest inference.</p></div><Badge tone={result ? 'green' : 'blue'}>{result ? 'Complete' : 'Awaiting input'}</Badge></div>
        {result ? <div className="result-filled"><span className="result-kicker">Probable disease</span><div className="result-disease">{result.disease}</div><div className="confidence-line"><span>Model confidence</span><strong>{result.confidence}%</strong></div><div className="confidence-bar"><i style={{ width: `${result.confidence}%` }} /></div><div className="factor-list">{factors.map((factor) => <div className="factor-item" key={factor}><Check />{factor}</div>)}</div><div className="panel-footer" style={{ borderColor: 'rgba(225,244,235,.14)' }}><span className="helper" style={{ color: '#a9c4be' }}>Risk band: <strong style={{ color: '#c9ea70' }}>{result.risk}</strong></span><Link href="/results" className="btn btn-primary" data-testid="link-see-results">See results <ChevronRight /></Link></div></div> : <div className="result-empty"><div><Target /><strong>Ready when you are</strong><span>Complete the patient profile, then generate a result to see the probable class and contributing signals.</span></div></div>}
      </section>
    </div>
    <div style={{ marginTop: 16 }}><SafetyDisclaimer /></div>
  </div>;
}

function ResultsPage({ predictions, onToast }: { predictions: Prediction[]; onToast: (message: string) => void }) {
  const [filter, setFilter] = useState('All');
  const filtered = filter === 'All' ? predictions : predictions.filter((prediction) => prediction.risk === filter);
  const exportResults = () => {
    const csv = ['Prediction ID,Patient,Disease,Confidence,Risk,Model,Date', ...predictions.map((item) => [item.id, item.patient, item.disease, `${item.confidence}%`, item.risk, item.model, item.date].join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'disease-prediction-results.csv'; anchor.click(); URL.revokeObjectURL(url);
    onToast('Results CSV prepared for download.');
  };
  return <div>
    <PageIntro eyebrow="Evidence log" title="Results you can explain." subtitle="Review every recent inference alongside its model, confidence, and risk band. Export a compact record for your viva notes." action={<button className="btn btn-primary" onClick={exportResults} data-testid="button-export-results"><Download /> Export CSV</button>} />
    <section className="panel"><div className="panel-heading"><div><h2>Recent predictions</h2><p>Newest results appear first and remain local to this demo workspace.</p></div><div className="filter-row">{['All', 'Low', 'Moderate', 'Elevated'].map((item) => <button className={`filter-chip ${filter === item ? 'active' : ''}`} key={item} onClick={() => setFilter(item)} data-testid={`button-filter-${item.toLowerCase()}`}>{item}</button>)}</div></div><PredictionTable rows={filtered} /><div className="panel-footer"><span className="helper"><ListChecks size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} /> Showing {filtered.length} of {predictions.length} recorded predictions.</span><Badge tone="blue">Local session</Badge></div></section>
    <div className="grid two-panel">
      <section className="panel"><div className="panel-heading"><div><h2>Model comparison</h2><p>Best held-out scores from the training lab.</p></div><BarChart3 size={19} color="#6d8990" /></div><div className="info-list">{modelRows.slice(0, 4).map((model) => <div className="info-row" key={model.name}><span>{model.name}</span><strong className="mono">{model.accuracy.toFixed(1)}% accuracy</strong></div>)}</div></section>
      <section className="panel"><div className="panel-heading"><div><h2>Read the output carefully</h2><p>Confidence is a model property, not certainty.</p></div><Info size={19} color="#6d8990" /></div><div className="info-list"><div className="info-row"><span>Current model</span><strong>Random Forest · v2.4</strong></div><div className="info-row"><span>Evaluation cohort</span><strong>249 held-out rows</strong></div><div className="info-row"><span>Last trained</span><strong>Today, 08:31</strong></div></div></section>
    </div>
    <div style={{ marginTop: 16 }}><SafetyDisclaimer /></div>
  </div>;
}

function RouterContent({ onToast }: { onToast: (message: string) => void }) {
  const [rows, setRows] = useState(seedRows);
  const [predictions, setPredictions] = useState(seedPredictions);
  return <Shell onToast={onToast}><Switch><Route path="/" component={() => <Overview onToast={onToast} />} /><Route path="/dataset" component={() => <DatasetPage rows={rows} setRows={setRows} onToast={onToast} />} /><Route path="/analysis" component={AnalysisPage} /><Route path="/models" component={() => <ModelsPage onToast={onToast} />} /><Route path="/prediction" component={() => <PredictionPage predictions={predictions} setPredictions={setPredictions} onToast={onToast} />} /><Route path="/results" component={() => <ResultsPage predictions={predictions} onToast={onToast} />} /><Route component={NotFound} /></Switch></Shell>;
}

function App() {
  const [toast, setToast] = useState('');
  const onToast = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><ErrorBoundary resetKey={window.location.pathname}><RouterContent onToast={onToast} /></ErrorBoundary></WouterRouter><Toaster />{toast && <div className="toast-note" role="status" data-testid="status-toast">{toast}</div>}</TooltipProvider></QueryClientProvider>;
}

export default App;