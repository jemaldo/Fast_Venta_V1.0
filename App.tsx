
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Settings, 
  ShoppingCart, 
  Plus, 
  Search,
  Printer,
  Edit2,
  Trash2,
  X,
  UserPlus,
  CreditCard,
  Banknote,
  History as HistoryIcon,
  ArrowRightLeft,
  Handshake,
  CheckCircle2,
  Lock,
  RotateCcw,
  Percent,
  Coins,
  Download,
  Upload,
  UserCheck,
  ShieldCheck,
  Save,
  Database,
  Mail,
  Phone,
  MapPin,
  ChevronRight,
  TrendingUp,
  Calendar,
  FileText,
  DollarSign,
  Sparkles,
  Loader2,
  Camera,
  ImageIcon,
  ReceiptText,
  Clock,
  Briefcase,
  FileSpreadsheet,
  BarChart3,
  FileDown,
  UploadCloud,
  LogOut,
  KeyRound,
  ShieldQuestion,
  ScanBarcode,
  Undo2,
  ShieldAlert,
  Image as ImageIconLucide,
  Wallet,
  Eye,
  EyeOff,
  Calculator,
  Target,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpToLine,
  FileJson,
  ToggleLeft,
  ToggleRight,
  UserX,
  History,
  FilePieChart,
  LineChart,
  PieChart,
  ArrowUpRight,
  BadgePercent,
  Info,
  Globe
} from 'lucide-react';
import { Product, Sale, Customer, StoreConfig, User, SaleItem, Role, Credit, CreditPayment, CreditStatus, SaleStatus, CardDetails } from './types';
import { INITIAL_PRODUCTS, INITIAL_STORE_CONFIG, INITIAL_USER, SECURITY_QUESTIONS } from './constants';
import { getInventoryAdvice } from './geminiService';
import { getData, saveData } from './dbService';

const AUTH_CODE = "03102010Asd*"; 

const PERMISSIONS_LIST = [
  { id: 'VIEW_DASHBOARD', label: 'Ver Dashboard', group: 'General' },
  { id: 'PROCESS_SALES', label: 'Procesar Ventas (POS)', group: 'Ventas' },
  { id: 'VIEW_HISTORY', label: 'Historial de Ventas', group: 'Ventas' },
  { id: 'VOID_SALES', label: 'Anular/Borrar Ventas', group: 'Ventas' },
  { id: 'PROCESS_RETURNS', label: 'Gestionar Devoluciones', group: 'Ventas' },
  { id: 'VIEW_INVENTORY', label: 'Ver Inventario', group: 'Inventario' },
  { id: 'EDIT_INVENTORY', label: 'Gestionar Productos', group: 'Inventario' },
  { id: 'MANAGE_CUSTOMERS', label: 'Gestionar Clientes', group: 'General' },
  { id: 'VIEW_REPORTS', label: 'Ver Informes Contables', group: 'Reportes' },
  { id: 'MANAGE_USERS', label: 'Control de Usuarios', group: 'Admin' },
  { id: 'EDIT_SETTINGS', label: 'Configuración Tienda', group: 'Admin' },
  { id: 'MANAGE_CREDITS', label: 'Gestionar Créditos/Cartera', group: 'Finanzas' },
];

const App: React.FC = () => {
  // --- Estados de Datos ---
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [sales, setSales] = useState<Sale[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([
    { id: 'c1', name: 'Cliente General', nit: '000000', email: 'mostrador@tienda.com', phone: '0000', address: 'N/A', isIvaResponsible: false }
  ]);
  const [users, setUsers] = useState<User[]>([
    { ...INITIAL_USER, permissions: PERMISSIONS_LIST.map(p => p.id), active: true }
  ]);
  const [config, setConfig] = useState<StoreConfig>(INITIAL_STORE_CONFIG);
  
  // --- Sesión ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User>(users[0]);
  const [activeTab, setActiveTab] = useState<string>('pos');
  const [loginError, setLoginError] = useState('');
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  // --- Modales ---
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  
  // --- Devoluciones ---
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<Sale | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});

  // --- Modal Tarjeta ---
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [tempCardDetails, setTempCardDetails] = useState<CardDetails>({ brand: 'VISA', lastFour: '', authCode: '' });

  // --- Seguridad ---
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authAction, setAuthAction] = useState<(() => void) | null>(null);
  const [authInput, setAuthInput] = useState('');
  
  // --- Modales Crédito ---
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isGeneralCreditsReportOpen, setIsGeneralCreditsReportOpen] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');

  // --- Filtros ---
  const [inventorySearch, setInventorySearch] = useState('');
  const [posSearch, setPosSearch] = useState('');
  const [creditSearch, setCreditSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  
  // --- POS ---
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>(customers[0]);
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO_PERSONAL'>('EFECTIVO');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(0);

  // --- Informes e Inventario ---
  const [reportStartDate, setReportStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [inventoryActiveSubTab, setInventoryActiveSubTab] = useState<'LISTA' | 'REPORTES' | 'CARGA'>('LISTA');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkUploadRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const posSearchInputRef = useRef<HTMLInputElement>(null);

  // --- Persistencia ---
  useEffect(() => {
    const loadAllData = async () => {
      try {
        const [p, s, cr, co, cu, u] = await Promise.all([
          getData('products'), getData('sales'), getData('credits'),
          getData('config'), getData('customers'), getData('users')
        ]);
        if (p) setProducts(p);
        if (s) setSales(s);
        if (cr) setCredits(cr);
        if (co) setConfig(co);
        if (cu) setCustomers(cu);
        if (u) setUsers(u);
        setIsDataLoaded(true);
      } catch (e) {
        setIsDataLoaded(true);
      }
    };
    loadAllData();
  }, []);

  useEffect(() => { if (isDataLoaded) saveData('products', products); }, [products]);
  useEffect(() => { if (isDataLoaded) saveData('sales', sales); }, [sales]);
  useEffect(() => { if (isDataLoaded) saveData('credits', credits); }, [credits]);
  useEffect(() => { if (isDataLoaded) saveData('config', config); }, [config]);
  useEffect(() => { if (isDataLoaded) saveData('customers', customers); }, [customers]);
  useEffect(() => { if (isDataLoaded) saveData('users', users); }, [users]);

  useEffect(() => {
    setTaxPercent(selectedCustomer.isIvaResponsible ? 19 : 0);
  }, [selectedCustomer]);

  // --- Computed Cart ---
  const subtotalCart = useMemo(() => cart.reduce((acc, item) => acc + (item.price * item.quantity), 0), [cart]);
  const discountVal = useMemo(() => (subtotalCart * discountPercent) / 100, [subtotalCart, discountPercent]);
  const taxVal = useMemo(() => ((subtotalCart - discountVal) * taxPercent) / 100, [subtotalCart, discountVal, taxPercent]);
  const totalCart = useMemo(() => subtotalCart - discountVal + taxVal, [subtotalCart, discountVal, taxPercent]);

  const canAccess = (tabId: string) => {
    if (currentUser.role === 'ADMIN' || currentUser.permissions.includes('ALL')) return true;
    const tabToPermission: Record<string, string> = {
      dashboard: 'VIEW_DASHBOARD', pos: 'PROCESS_SALES', history: 'VIEW_HISTORY',
      inventory: 'VIEW_INVENTORY', credits: 'MANAGE_CREDITS', customers: 'MANAGE_CUSTOMERS',
      reports: 'VIEW_REPORTS', users: 'MANAGE_USERS', settings: 'EDIT_SETTINGS',
    };
    return currentUser.permissions.includes(tabToPermission[tabId]);
  };

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return alert("Sin existencias");
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { productId: product.id, name: product.name, quantity: 1, price: product.price }];
    });
  };

  const handleBarcodeSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const sku = posSearch.trim();
      const product = products.find(p => p.sku.toUpperCase() === sku.toUpperCase());
      if (product) {
        addToCart(product);
        setPosSearch('');
      }
    }
  };

  const handlePreCompleteSale = () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'TARJETA') {
      setIsCardModalOpen(true);
    } else {
      completeSale();
    }
  };

  const completeSale = (cardDetails?: CardDetails) => {
    const newSale: Sale = {
      id: `S${Date.now()}`, date: new Date().toISOString(), items: [...cart],
      subtotal: subtotalCart, taxAmount: taxVal, discountAmount: discountVal, total: totalCart,
      customerId: selectedCustomer.id, paymentMethod, cardDetails, userId: currentUser.id, status: 'COMPLETED'
    };
    setProducts(prev => prev.map(p => {
      const item = cart.find(i => i.productId === p.id);
      return item ? { ...p, stock: p.stock - item.quantity } : p;
    }));
    if (paymentMethod === 'CREDITO_PERSONAL') {
      setCredits(prev => [...prev, {
        id: `CR${Date.now()}`, saleId: newSale.id, customerId: selectedCustomer.id,
        totalAmount: totalCart, balance: totalCart, status: 'ACTIVE',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), payments: []
      }]);
    }
    setSales(prev => [newSale, ...prev]);
    setLastSale(newSale);
    setIsTicketOpen(true);
    setCart([]);
    setDiscountPercent(0);
    setIsCardModalOpen(false);
    setTempCardDetails({ brand: 'VISA', lastFour: '', authCode: '' });
  };

  // --- Seguridad ---
  const requestAuth = (onSuccess: () => void) => {
    setAuthAction(() => onSuccess);
    setAuthInput('');
    setIsAuthModalOpen(true);
  };

  const handleAuthConfirm = () => {
    if (authInput === AUTH_CODE) {
      if (authAction) authAction();
      setIsAuthModalOpen(false);
      setAuthAction(null);
    } else {
      alert("Código maestro incorrecto");
    }
  };

  // --- Devoluciones e Historial ---
  const handleStartReturn = (sale: Sale) => {
    setSelectedSaleForReturn(sale);
    const initialQtys: Record<string, number> = {};
    sale.items.forEach(i => initialQtys[i.productId] = 0);
    setReturnQuantities(initialQtys);
    setIsReturnModalOpen(true);
  };

  const handleProcessReturn = () => {
    if (!selectedSaleForReturn) return;
    const hasReturns = Object.values(returnQuantities).some(q => (q as number) > 0);
    if (!hasReturns) return alert("Seleccione al menos un artículo para devolver");

    requestAuth(() => {
      const updatedProducts = [...products];
      const updatedSales = [...sales];
      const saleIdx = updatedSales.findIndex(s => s.id === selectedSaleForReturn.id);
      
      if (saleIdx === -1) return;

      const sale = { ...updatedSales[saleIdx] };
      sale.items = sale.items.map(item => {
        const qtyToReturn = returnQuantities[item.productId] || 0;
        if (qtyToReturn > 0) {
          const pIdx = updatedProducts.findIndex(p => p.id === item.productId);
          if (pIdx !== -1) updatedProducts[pIdx].stock += qtyToReturn;
          return { ...item, returnedQuantity: (item.returnedQuantity || 0) + qtyToReturn };
        }
        return item;
      });

      const totalSold = sale.items.reduce((acc, i) => acc + i.quantity, 0);
      // FIXED: Corrected the variable reference from 'item' to 'i' in the reducer callback
      const totalReturned = sale.items.reduce((acc, i) => acc + (i.returnedQuantity || 0), 0);
      
      if (totalReturned === totalSold) {
        sale.status = 'VOIDED';
      } else {
        sale.status = 'RETURNED';
      }

      updatedSales[saleIdx] = sale;
      setProducts(updatedProducts);
      setSales(updatedSales);
      setIsReturnModalOpen(false);
      setSelectedSaleForReturn(null);
      alert("Devolución procesada correctamente.");
    });
  };

  const handleDeleteSale = (sale: Sale) => {
    requestAuth(() => {
      setProducts(prev => prev.map(p => {
        const item = sale.items.find(i => i.productId === p.id);
        if (item) {
          const qtyInStore = item.quantity - (item.returnedQuantity || 0);
          return { ...p, stock: p.stock + qtyInStore };
        }
        return p;
      }));
      setSales(prev => prev.filter(s => s.id !== sale.id));
      setCredits(prev => prev.filter(c => c.saleId !== sale.id));
      alert("Venta eliminada e inventario restablecido.");
    });
  };

  const handleAddPayment = () => {
    if (!selectedCredit || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0 || amount > selectedCredit.balance) {
      alert("Monto inválido o superior al saldo actual");
      return;
    }
    const newPayment: CreditPayment = { 
      id: `P${Date.now()}`, 
      date: new Date().toISOString(), 
      amount, 
      method: 'EFECTIVO' 
    };
    const updatedBalance = selectedCredit.balance - amount;
    const updatedStatus: CreditStatus = updatedBalance <= 0.01 ? 'PAID' : selectedCredit.status;

    setCredits(prev => prev.map(c => c.id === selectedCredit.id ? { 
      ...c, 
      balance: Math.max(0, updatedBalance), 
      status: updatedStatus, 
      payments: [...c.payments, newPayment] 
    } : c));
    
    setIsPaymentModalOpen(false);
    setPaymentAmount('');
    setSelectedCredit(null);
    alert("Abono registrado correctamente.");
  };

  const handleCloseCreditManually = (credit: Credit) => {
    requestAuth(() => {
      setCredits(prev => prev.map(c => c.id === credit.id ? { ...c, balance: 0, status: 'PAID' } : c));
      alert("Crédito cerrado manualmente.");
    });
  };

  const handleGetAiAdvice = async () => {
    setIsAiLoading(true);
    try {
      const advice = await getInventoryAdvice(products);
      setAiAdvice(advice || "No se pudo obtener el consejo.");
    } catch (e) {
      setAiAdvice("Error al conectar con la IA.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const u = fd.get('username') as string;
    const p = fd.get('password') as string;
    const user = users.find(usr => usr.username === u && usr.password === p);
    
    if (user) {
      if (user.active === false) {
        setLoginError('Usuario inactivo. Contacte al administrador.');
        return;
      }
      setIsLoggedIn(true); 
      setCurrentUser(user); 
      setActiveTab('dashboard'); 
    } else { 
      setLoginError('Error de acceso'); 
    }
  };

  const handleLogout = () => { setIsLoggedIn(false); setActiveTab('pos'); };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setConfig(prev => ({ ...prev, logo: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  // --- FUNCIONES DE INVENTARIO AVANZADO ---
  const downloadBulkTemplate = () => {
    const headers = "nombre,categoria,precio_venta,costo,stock,min_stock,marca,sku\n";
    const blob = new Blob([headers], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = "plantilla_inventario_sportmaster.csv";
    link.click();
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const csv = event.target?.result as string;
          const lines = csv.split('\n').filter(l => l.trim() !== '');
          const newProducts: Product[] = [];
          
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',');
            if (cols.length >= 8) {
              newProducts.push({
                id: `p${Date.now()}${i}`,
                name: cols[0].trim(),
                category: cols[1].trim(),
                price: parseFloat(cols[2]),
                cost: parseFloat(cols[3]),
                stock: parseInt(cols[4]),
                minStock: parseInt(cols[5]),
                brand: cols[6].trim(),
                sku: cols[7].trim()
              });
            }
          }
          
          if (newProducts.length > 0) {
            setProducts(prev => [...prev, ...newProducts]);
            alert(`Se han cargado ${newProducts.length} productos con éxito.`);
          }
        } catch (err) {
          alert("Error al procesar el archivo CSV.");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExportData = () => {
    const data = { products, sales, credits, customers, users, config };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sportmaster_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedData = JSON.parse(event.target?.result as string);
          if (importedData.products) setProducts(importedData.products);
          if (importedData.sales) setSales(importedData.sales);
          if (importedData.credits) setCredits(importedData.credits);
          if (importedData.customers) setCustomers(importedData.customers);
          if (importedData.users) setUsers(importedData.users);
          if (importedData.config) setConfig(importedData.config);
          alert("Datos restaurados correctamente");
        } catch (err) {
          alert("Error al importar el archivo JSON");
        }
      };
      reader.readAsText(file);
    }
  };

  // --- VISTAS ---
  const HistoryView = () => {
    const filtered = sales.filter(s => 
      s.id.toLowerCase().includes(historySearch.toLowerCase()) || 
      (customers.find(c => c.id === s.customerId)?.name || '').toLowerCase().includes(historySearch.toLowerCase())
    );

    return (
      <div className="bg-white p-6 rounded-3xl border shadow-sm no-print animate-in fade-in duration-500">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-xl font-black uppercase italic flex items-center gap-3"><HistoryIcon className="text-blue-600" /> Historial de Ventas</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Registro de Transacciones</p>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input 
              type="text" 
              placeholder="Buscar Venta o Cliente..." 
              className="pl-10 pr-4 py-2 border rounded-xl text-xs font-bold w-64 focus:ring-1 focus:ring-blue-500 outline-none" 
              value={historySearch} 
              onChange={e => setHistorySearch(e.target.value)} 
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[10px] font-black uppercase border-b text-slate-400 tracking-widest">
              <tr>
                <th className="pb-4">Fecha/Hora</th>
                <th className="pb-4">ID Venta</th>
                <th className="pb-4">Cliente</th>
                <th className="pb-4">Total</th>
                <th className="pb-4">Pago</th>
                <th className="pb-4">Estado</th>
                <th className="pb-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(s => (
                <tr key={s.id} className={`hover:bg-slate-50 transition-colors ${s.status === 'VOIDED' ? 'opacity-40' : ''}`}>
                  <td className="py-4 text-[10px] font-bold text-slate-500">{new Date(s.date).toLocaleString()}</td>
                  <td className="py-4 font-mono text-[10px] font-black">#{s.id.slice(-8)}</td>
                  <td className="py-4 font-black uppercase italic text-slate-800">{customers.find(c => c.id === s.customerId)?.name || 'Mostrador'}</td>
                  <td className="py-4 font-black text-blue-600">${s.total.toFixed(2)}</td>
                  <td className="py-4 text-[9px] font-bold uppercase">{s.paymentMethod.replace('_', ' ')}</td>
                  <td>
                    <span className={`px-2 py-1 rounded-lg font-black text-[8px] uppercase ${
                      s.status === 'VOIDED' ? 'bg-red-500 text-white' : 
                      s.status === 'RETURNED' ? 'bg-orange-100 text-orange-600' : 
                      'bg-green-100 text-green-600'
                    }`}>
                      {s.status || 'COMPLETED'}
                    </span>
                  </td>
                  <td className="text-right flex justify-end gap-1">
                    <button onClick={() => { setLastSale(s); setIsTicketOpen(true); }} className="text-slate-400 hover:text-slate-900 p-2"><Printer size={16}/></button>
                    {s.status !== 'VOIDED' && (
                      <>
                        <button onClick={() => handleStartReturn(s)} className="text-orange-400 hover:text-orange-600 p-2"><RotateCcw size={16}/></button>
                        <button onClick={() => handleDeleteSale(s)} className="text-red-300 hover:text-red-600 p-2"><Trash2 size={16}/></button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="py-20 text-center font-black uppercase text-slate-300">No hay registros</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const InventoryView = () => {
    const filtered = products.filter(p => p.name.toLowerCase().includes(inventorySearch.toLowerCase()) || p.sku.toLowerCase().includes(inventorySearch.toLowerCase()));
    const totalInventoryValue = products.reduce((acc, p) => acc + (p.stock * p.cost), 0);
    const totalSaleValue = products.reduce((acc, p) => acc + (p.stock * p.price), 0);
    const lowStockItems = products.filter(p => p.stock > 0 && p.stock <= p.minStock);
    const outOfStockItems = products.filter(p => p.stock <= 0);

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex bg-white p-2 rounded-2xl border shadow-sm no-print mb-4 w-fit">
          {['LISTA', 'REPORTES', 'CARGA'].map((sub) => (
            <button key={sub} onClick={() => setInventoryActiveSubTab(sub as any)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${inventoryActiveSubTab === sub ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-800'}`}>{sub}</button>
          ))}
        </div>
        {inventoryActiveSubTab === 'LISTA' && (
          <div className="bg-white p-6 rounded-3xl border shadow-sm no-print">
            <div className="flex justify-between items-center mb-8">
              <div><h3 className="text-xl font-black uppercase italic flex items-center gap-3"><Package className="text-blue-600" /> Control de Stock</h3></div>
              <div className="flex gap-2">
                <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" placeholder="SKU o Nombre..." className="pl-10 pr-4 py-2 border rounded-xl text-xs font-bold w-64 focus:ring-1 focus:ring-blue-500 outline-none" value={inventorySearch} onChange={e => setInventorySearch(e.target.value)} /></div>
                <button onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg flex items-center gap-2 transition-all"><Plus size={14}/> Agregar</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm"><thead className="text-[10px] font-black uppercase border-b text-slate-400 tracking-widest"><tr><th className="pb-4">SKU</th><th className="pb-4">Descripción</th><th className="pb-4">Marca</th><th className="pb-4">Stock</th><th className="pb-4">Costo</th><th className="pb-4">Venta</th><th className="pb-4 text-right">Acción</th></tr></thead><tbody className="divide-y">{filtered.map(p => (<tr key={p.id} className="hover:bg-slate-50 transition-colors"><td className="py-4 font-mono text-[9px] font-bold text-slate-400">{p.sku}</td><td className="py-4 font-black uppercase italic text-slate-800">{p.name}</td><td className="py-4 text-[10px] font-bold text-slate-500 uppercase">{p.brand}</td><td><span className={`px-2 py-1 rounded-lg font-black text-[10px] ${p.stock <= 0 ? 'bg-red-500 text-white' : p.stock <= p.minStock ? 'bg-orange-100 text-orange-600' : 'bg-green-50 text-green-600'}`}>{p.stock}</span></td><td className="font-bold text-slate-500">${p.cost.toFixed(2)}</td><td className="font-black text-blue-600">${p.price.toFixed(2)}</td><td className="text-right"><button onClick={() => {setEditingProduct(p); setIsProductModalOpen(true);}} className="text-blue-600 p-2 hover:bg-blue-50 rounded-lg"><Edit2 size={16}/></button></td></tr>))}</tbody></table>
            </div>
          </div>
        )}
        {inventoryActiveSubTab === 'REPORTES' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-3xl border shadow-sm"><h4 className="text-sm font-black uppercase text-slate-700 italic flex items-center gap-2 border-b pb-4 mb-6"><Calculator size={18} className="text-blue-600"/> Resumen Valorizado</h4><div className="space-y-4"><div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase">Valorización (Costo)</span><span className="text-xl font-black text-slate-900">${totalInventoryValue.toLocaleString()}</span></div><div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase">Valorización (Venta)</span><span className="text-xl font-black text-blue-600">${totalSaleValue.toLocaleString()}</span></div><div className="flex justify-between items-center border-t pt-4"><span className="text-[10px] font-black text-slate-400 uppercase">Margen Potencial Bruto</span><span className="text-xl font-black text-green-600">${(totalSaleValue - totalInventoryValue).toLocaleString()}</span></div></div><button onClick={() => window.print()} className="w-full mt-6 bg-slate-900 text-white py-3 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2"><Printer size={16}/> Imprimir Reporte</button></div>
              <div className="bg-white p-8 rounded-3xl border shadow-sm"><h4 className="text-sm font-black uppercase text-slate-700 italic flex items-center gap-2 border-b pb-4 mb-6"><AlertTriangle size={18} className="text-orange-500"/> Alertas de Pedido</h4><div className="space-y-4"><div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase">Productos Bajos Stock</span><span className="text-xl font-black text-orange-600">{lowStockItems.length}</span></div><div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase">Productos Agotados</span><span className="text-xl font-black text-red-600">{outOfStockItems.length}</span></div></div></div>
            </div>
          </div>
        )}
        {inventoryActiveSubTab === 'CARGA' && (
          <div className="max-w-xl mx-auto space-y-8 py-10 text-center"><div className="bg-white p-10 rounded-[2.5rem] border shadow-xl"><div className="w-20 h-20 bg-blue-100 rounded-3xl mx-auto flex items-center justify-center text-blue-600 mb-6"><ArrowUpToLine size={32} /></div><h3 className="text-xl font-black uppercase italic mb-2">Cargue Masivo</h3><button onClick={() => bulkUploadRef.current?.click()} className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-xl flex items-center justify-center gap-3"><FileSpreadsheet size={18}/> Seleccionar CSV</button><input type="file" ref={bulkUploadRef} className="hidden" accept=".csv" onChange={handleBulkUpload} /><button onClick={downloadBulkTemplate} className="w-full bg-slate-100 text-slate-600 py-4 rounded-3xl font-black uppercase text-[10px] flex items-center justify-center gap-3 mt-3 hover:bg-slate-200 transition-all"><ArrowDownToLine size={18}/> Descargar Plantilla</button></div></div>
        )}
      </div>
    );
  };

  const Sidebar = () => (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col fixed h-full z-20 border-r border-slate-800 no-print">
      <div className="p-8"><div className="flex items-center gap-3 text-white mb-2"><div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-blue-900/40">{config.logo ? <img src={config.logo} alt="Logo" className="w-full h-full object-cover rounded-xl" /> : 'S'}</div><div><h1 className="font-black text-2xl tracking-tighter italic">SPORT</h1><p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Master POS Pro</p></div></div></div>
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {[ 
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }, 
          { id: 'pos', label: 'Caja Registradora', icon: ShoppingCart }, 
          { id: 'history', label: 'Historial', icon: HistoryIcon }, 
          { id: 'inventory', label: 'Inventario', icon: Package }, 
          { id: 'credits', label: 'Cartera', icon: Handshake }, 
          { id: 'reports', label: 'Reportes Contables', icon: BarChart3 }, 
          { id: 'users', label: 'Usuarios', icon: UserCheck }, 
          { id: 'settings', label: 'Ajustes', icon: Settings } 
        ].map(item => canAccess(item.id) && (<button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'hover:bg-slate-800'}`}><item.icon size={18} /><span className="font-bold text-sm">{item.label}</span></button>))}
      </nav>
      <div className="p-6 border-t border-slate-800 space-y-3"><div className="bg-slate-800/50 p-4 rounded-2xl flex flex-col gap-1"><p className="text-[10px] font-black text-white uppercase truncate">{currentUser.name}</p></div><button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase text-red-400 hover:bg-red-500/10 rounded-xl"><LogOut size={14} /> Cerrar Sesión</button></div>
    </aside>
  );

  if (!isLoggedIn) return <LoginView onLogin={handleLogin} error={loginError} />;

  return (
    <div className="flex min-h-screen bg-slate-50 selection:bg-blue-100">
      <Sidebar />
      <main className="ml-64 flex-1 p-8 print:ml-0 print:p-0">
        <header className="flex justify-between items-center mb-10 no-print">
          <div><h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">{activeTab === 'pos' ? 'Caja' : activeTab === 'credits' ? 'Cartera' : activeTab.toUpperCase()}</h2><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{config.slogan}</p></div>
          <div className="bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="text-right font-black"><p className="text-[9px] text-slate-400">{config.nit}</p><p className="text-sm text-slate-800">{config.name}</p></div>
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center border">{config.logo ? <img src={config.logo} alt="Logo" className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-slate-300" />}</div>
          </div>
        </header>

        {activeTab === 'pos' && (
          <div className="grid grid-cols-12 gap-6 h-[calc(100vh-140px)] no-print">
            <div className="col-span-8 flex flex-col gap-4">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input ref={posSearchInputRef} type="text" placeholder="Escanear Código..." className="w-full pl-10 pr-12 py-3 rounded-xl border font-black uppercase text-sm outline-none shadow-sm" value={posSearch} onChange={e => setPosSearch(e.target.value)} onKeyDown={handleBarcodeSubmit} autoFocus /></div>
              <div className="grid grid-cols-4 gap-4 overflow-y-auto pr-2 custom-scrollbar">
                {products.filter(p => p.name.toLowerCase().includes(posSearch.toLowerCase()) || p.sku.toLowerCase().includes(posSearch.toLowerCase())).map(p => (<button key={p.id} onClick={() => addToCart(p)} disabled={p.stock <= 0} className="bg-white p-4 rounded-2xl border text-left hover:border-blue-500 flex flex-col h-44 group relative"><div className="flex-1 bg-slate-50 rounded-xl mb-2 flex items-center justify-center border">{p.stock <= 0 ? <span className="text-[10px] font-black text-red-500 uppercase">Sin Stock</span> : <Package size={24} className="text-slate-200" />}</div><h4 className="font-black text-[10px] uppercase truncate mb-1">{p.name}</h4><p className="font-black text-blue-600 text-lg tracking-tighter">${p.price}</p></button>))}
              </div>
            </div>
            <div className="col-span-4 flex flex-col gap-4">
              <div className="bg-white p-4 rounded-2xl border">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase block">Cliente</label>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingCustomer(selectedCustomer); setIsCustomerModalOpen(true); }} className="text-blue-500 hover:text-blue-700 p-1 bg-blue-50 rounded-lg"><Edit2 size={12}/></button>
                    <button onClick={() => { setEditingCustomer(null); setIsCustomerModalOpen(true); }} className="text-green-500 hover:text-green-700 p-1 bg-green-50 rounded-lg"><Plus size={12}/></button>
                  </div>
                </div>
                <select className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs font-black uppercase" value={selectedCustomer.id} onChange={e => setSelectedCustomer(customers.find(c => c.id === e.target.value) || customers[0])}>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              </div>
              <div className="flex-1 bg-white rounded-2xl shadow-lg border flex flex-col overflow-hidden">
                <div className="p-4 border-b bg-slate-50 font-black text-[10px] uppercase">Carrito de Ventas</div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {cart.map(i => (<div key={i.productId} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border"><div className="flex-1"><p className="text-[10px] font-black uppercase italic truncate">{i.name}</p><p className="text-[9px] text-slate-400">${i.price} x {i.quantity}</p></div><button onClick={() => setCart(cart.filter(x => x.productId !== i.productId))} className="text-red-300"><Trash2 size={14}/></button></div>))}
                </div>
                
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Descuento (%)</label>
                    <div className="relative">
                      <Percent className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300" size={10} />
                      <input type="number" min="0" max="100" className="w-full pl-6 pr-2 py-1.5 border rounded-lg text-[10px] font-black outline-none focus:ring-1 focus:ring-blue-500" value={discountPercent} onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">IVA (%)</label>
                    <div className="relative">
                      <Coins className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300" size={10} />
                      <input type="number" min="0" max="100" className="w-full pl-6 pr-2 py-1.5 border rounded-lg text-[10px] font-black outline-none focus:ring-1 focus:ring-blue-500" value={taxPercent} onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-slate-900 text-white space-y-4">
                  <div className="space-y-1 text-[9px] font-bold text-slate-400 mb-2">
                    <div className="flex justify-between"><span>Subtotal Bruto</span><span>${subtotalCart.toFixed(2)}</span></div>
                    {discountVal > 0 && <div className="flex justify-between text-red-400"><span>Descuento</span><span>-${discountVal.toFixed(2)}</span></div>}
                    {taxVal > 0 && <div className="flex justify-between text-blue-400"><span>Impuesto IVA</span><span>+${taxVal.toFixed(2)}</span></div>}
                  </div>
                  
                  <div className="flex justify-between text-2xl font-black italic tracking-tighter border-t border-slate-800 pt-3">
                    <span>TOTAL</span>
                    <span className="text-blue-400">${totalCart.toFixed(2)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CREDITO_PERSONAL'].map(m => (
                      <button 
                        key={m} 
                        onClick={() => setPaymentMethod(m as any)} 
                        className={`p-2 rounded-xl text-[8px] font-black border transition-all ${paymentMethod === m ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                      >
                        {m.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  <button onClick={handlePreCompleteSale} disabled={cart.length === 0} className="w-full bg-blue-500 text-slate-900 py-4 rounded-xl font-black uppercase tracking-widest text-sm shadow-xl active:scale-95">GENERAR FACTURA</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && <HistoryView />}
        {activeTab === 'inventory' && <InventoryView />}
        {activeTab === 'reports' && <ReportsView sales={sales} reportStartDate={reportStartDate} setReportStartDate={setReportStartDate} reportEndDate={reportEndDate} setReportEndDate={setReportEndDate} config={config} customers={customers} products={products} />}
        {activeTab === 'users' && <UsersManagerView users={users} setUsers={setUsers} setIsUserModalOpen={setIsUserModalOpen} setEditingUser={setEditingUser} />}
        {activeTab === 'customers' && <CustomersView customers={customers} setCustomers={setCustomers} setEditingCustomer={setEditingCustomer} setIsCustomerModalOpen={setIsCustomerModalOpen} />}
        {activeTab === 'settings' && <SettingsView config={config} setConfig={setConfig} handleLogoUpload={handleLogoUpload} logoInputRef={logoInputRef} handleExportData={handleExportData} handleImportData={handleImportData} fileInputRef={fileInputRef} />}
        {activeTab === 'dashboard' && <DashboardView sales={sales} products={products} credits={credits} customers={customers} setActiveTab={setActiveTab} />}
        {activeTab === 'credits' && <CreditsView credits={credits} customers={customers} setIsPaymentModalOpen={setIsPaymentModalOpen} setSelectedCredit={setSelectedCredit} creditSearch={creditSearch} setCreditSearch={setCreditSearch} setIsHistoryModalOpen={setIsHistoryModalOpen} handleCloseCreditManually={handleCloseCreditManually} setIsGeneralCreditsReportOpen={setIsGeneralCreditsReportOpen} />}

        {/* MODAL REPORTE GENERAL DE CARTERA */}
        {isGeneralCreditsReportOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 no-print-backdrop no-print">
            <div className="bg-white w-full max-w-4xl p-10 rounded-[3rem] shadow-2xl relative overflow-y-auto max-h-[90vh] printable-area-large">
               <div className="flex justify-between items-start mb-8 no-print">
                  <div>
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter">Reporte General de Saldos</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Resumen de Cartera al {new Date().toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => window.print()} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs flex items-center gap-2 transition-all hover:bg-blue-700 shadow-xl"><Printer size={16}/> Imprimir Reporte</button>
                    <button onClick={() => setIsGeneralCreditsReportOpen(false)} className="text-slate-400 hover:text-red-500 p-2"><X size={24}/></button>
                  </div>
               </div>
               
               <div className="print-content">
                 <div className="hidden print:flex justify-between items-center mb-10 border-b-2 pb-6">
                    <div><h2 className="text-2xl font-black uppercase">{config.name}</h2><p className="text-xs font-bold uppercase">{config.nit}</p></div>
                    <div className="text-right"><h3 className="text-xl font-black uppercase">Balance de Cartera</h3><p className="text-[10px] uppercase font-bold text-slate-400">{new Date().toLocaleDateString()}</p></div>
                 </div>
                 <table className="w-full text-left">
                    <thead className="border-b-2 border-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <tr>
                        <th className="py-4 px-2">ID Ref</th>
                        <th className="py-4 px-2">Cliente</th>
                        <th className="py-4 px-2 text-right">Crédito Total</th>
                        <th className="py-4 px-2 text-right">Saldo Pendiente</th>
                        <th className="py-4 px-2">Vencimiento</th>
                        <th className="py-4 px-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y border-b-2 border-slate-900">
                      {credits.filter(c => c.status !== 'PAID').map(c => (
                        <tr key={c.id} className="text-xs">
                          <td className="py-4 px-2 font-mono">#{c.id.slice(-6)}</td>
                          <td className="py-4 px-2 font-black uppercase italic">{customers.find(cus => cus.id === c.customerId)?.name || 'N/A'}</td>
                          <td className="py-4 px-2 text-right font-bold">${c.totalAmount.toLocaleString()}</td>
                          <td className="py-4 px-2 text-right font-black text-red-600">${c.balance.toLocaleString()}</td>
                          <td className="py-4 px-2 font-bold">{new Date(c.dueDate).toLocaleDateString()}</td>
                          <td className="py-4 px-2 font-black uppercase text-[10px]">{c.status}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="py-6 text-right font-black uppercase tracking-tighter text-base">Total Cartera Pendiente:</td>
                        <td className="py-6 text-right font-black text-xl italic text-slate-900 underline decoration-blue-500 decoration-4 underline-offset-4">
                          ${credits.filter(c => c.status !== 'PAID').reduce((acc, c) => acc + c.balance, 0).toLocaleString()}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                 </table>
               </div>
            </div>
          </div>
        )}

        {/* MODAL ABONO (CARTERA) */}
        {isPaymentModalOpen && selectedCredit && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm no-print">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-200">
               <div className="bg-blue-600 p-6 flex justify-between items-center text-white">
                  <div className="flex items-center gap-3"><Coins size={24}/><h3 className="font-black uppercase tracking-tighter text-lg italic">Registrar Abono</h3></div>
                  <button onClick={() => setIsPaymentModalOpen(false)} className="text-white/70 hover:text-white"><X size={24}/></button>
               </div>
               <div className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-slate-50 p-4 rounded-2xl border text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Saldo Actual</p>
                        <p className="text-xl font-black text-slate-800">${selectedCredit.balance.toLocaleString()}</p>
                     </div>
                     <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-center">
                        <p className="text-[9px] font-black text-blue-400 uppercase">Total Crédito</p>
                        <p className="text-xl font-black text-blue-600">${selectedCredit.totalAmount.toLocaleString()}</p>
                     </div>
                  </div>
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block ml-2">Monto del Abono</label>
                     <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600" size={24}/>
                        <input 
                           type="number" 
                           placeholder="0.00" 
                           className="w-full pl-12 pr-6 py-5 border-2 border-slate-100 rounded-3xl text-2xl font-black text-slate-800 focus:border-blue-600 outline-none" 
                           value={paymentAmount} 
                           onChange={e => setPaymentAmount(e.target.value)} 
                           autoFocus
                        />
                     </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-500 uppercase text-center">Saldo después del abono: <span className="font-black text-blue-600">${(selectedCredit.balance - (parseFloat(paymentAmount) || 0)).toLocaleString()}</span></p>
                  </div>
                  <button onClick={handleAddPayment} className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Confirmar Pago</button>
               </div>
            </div>
          </div>
        )}

        {/* MODAL HISTORIAL DE PAGOS (CARTERA) - REPORTE POR CLIENTE */}
        {isHistoryModalOpen && selectedCredit && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm no-print-backdrop no-print">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-200 printable-area-medium">
               <div className="bg-slate-900 p-6 flex justify-between items-center text-white no-print">
                  <div className="flex items-center gap-3"><History size={24} className="text-blue-400"/><h3 className="font-black uppercase tracking-tighter text-lg italic">Historial de Abonos</h3></div>
                  <div className="flex gap-2">
                    <button onClick={() => window.print()} title="Imprimir Reporte por Cliente" className="text-white bg-blue-600 p-2 rounded-xl hover:bg-blue-700 transition-all shadow-lg"><Printer size={20}/></button>
                    <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-white"><X size={24}/></button>
                  </div>
               </div>
               <div className="p-8 max-h-[500px] overflow-y-auto custom-scrollbar">
                  <div className="hidden print:block text-center mb-8 border-b-2 pb-4">
                     <h2 className="text-xl font-black uppercase tracking-tighter">{config.name}</h2>
                     <p className="text-[8px] font-black uppercase tracking-widest italic text-slate-400">Estado de Cuenta de Cliente</p>
                  </div>
                  <div className="mb-6 p-4 bg-slate-50 rounded-2xl border flex justify-between items-center">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase">Deudor</p>
                      <p className="font-black text-slate-800 uppercase italic tracking-tighter text-base">{customers.find(c => c.id === selectedCredit.customerId)?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase">Referencia</p>
                      <p className="font-mono text-[10px] font-black">Ref: #{selectedCredit.id.slice(-6)}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                     <h4 className="text-[10px] font-black uppercase text-blue-600 mb-2 px-2 border-b">Detalle de Abonos</h4>
                     {selectedCredit.payments.length === 0 ? (
                        <div className="py-10 text-center font-black uppercase text-slate-300">No hay abonos registrados</div>
                     ) : (
                        selectedCredit.payments.map((p, idx) => (
                           <div key={p.id} className="flex justify-between items-center p-4 bg-white border-b hover:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-black text-xs print:hidden">{idx + 1}</div>
                                 <div>
                                    <p className="text-sm font-black text-slate-800">${p.amount.toLocaleString()}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">{new Date(p.date).toLocaleString()}</p>
                                 </div>
                              </div>
                              <span className="text-[8px] font-black px-2 py-1 bg-green-50 text-green-600 rounded-lg uppercase">RECIBIDO</span>
                           </div>
                        ))
                     )}
                  </div>
                  <div className="mt-8 pt-6 border-t flex justify-between items-end">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase">Total Abonado</p>
                      <p className="text-xl font-black text-green-600">${(selectedCredit.totalAmount - selectedCredit.balance).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase">Saldo Pendiente</p>
                      <p className="text-xl font-black text-red-600">${selectedCredit.balance.toLocaleString()}</p>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* MODAL TICKET DE VENTA */}
        {isTicketOpen && lastSale && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 no-print-backdrop no-print">
            <div className="bg-white w-full max-w-xs p-8 font-mono text-[10px] shadow-2xl printable-area">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-slate-900 rounded-xl mx-auto flex items-center justify-center text-white mb-2">{config.logo ? <img src={config.logo} className="w-full h-full object-cover rounded-xl" /> : 'S'}</div>
                <h2 className="text-sm font-black uppercase">{config.name}</h2>
                <p>NIT: {config.nit}</p>
                <p>{config.address}</p>
                <div className="border-b border-dashed my-2"></div>
                <p className="font-black">TICKET DE VENTA</p>
                <p>#{lastSale.id.slice(-8)} | {new Date(lastSale.date).toLocaleDateString()}</p>
              </div>
              <div className="space-y-1 mb-4">
                <div className="flex justify-between font-black uppercase text-[8px]"><span>Articulo</span><span>Total</span></div>
                {lastSale.items.map((it, idx) => (<div key={idx} className="flex justify-between"><span>{it.name.slice(0,15)} x{it.quantity}</span><span>${(it.price * it.quantity).toFixed(2)}</span></div>))}
              </div>
              <div className="border-t border-dashed pt-2 space-y-1">
                <div className="flex justify-between font-black text-[9px]"><span>SUBTOTAL</span><span>${lastSale.subtotal.toFixed(2)}</span></div>
                {lastSale.discountAmount > 0 && <div className="flex justify-between text-red-600"><span>DESCUENTO</span><span>-${lastSale.discountAmount.toFixed(2)}</span></div>}
                {lastSale.taxAmount > 0 && <div className="flex justify-between text-blue-600"><span>IVA</span><span>+${lastSale.taxAmount.toFixed(2)}</span></div>}
                <div className="flex justify-between text-xs font-black pt-1"><span>TOTAL NETO</span><span>${lastSale.total.toFixed(2)}</span></div>
              </div>
              <div className="border-t border-dashed mt-4 pt-2 text-[8px] font-bold uppercase space-y-0.5">
                <div className="flex justify-between"><span>CLIENTE:</span><span>{customers.find(c => c.id === lastSale.customerId)?.name || 'MOSTRADOR'}</span></div>
                <div className="flex justify-between"><span>FORMA DE PAGO:</span><span>{lastSale.paymentMethod}</span></div>
                {lastSale.paymentMethod === 'TARJETA' && lastSale.cardDetails && (
                  <>
                    <div className="flex justify-between"><span>FRANQUICIA:</span><span>{lastSale.cardDetails.brand}</span></div>
                    <div className="flex justify-between"><span>TARJETA:</span><span>**** {lastSale.cardDetails.lastFour}</span></div>
                    <div className="flex justify-between"><span>AUTORIZACIÓN:</span><span>{lastSale.cardDetails.authCode}</span></div>
                  </>
                )}
              </div>
              <p className="text-center mt-6 uppercase text-[8px] font-bold">{config.slogan}</p>
              <button 
                onClick={() => {
                  window.print();
                }} 
                className="mt-6 w-full bg-slate-900 text-white py-3 rounded-xl font-black uppercase text-[10px] no-print transition-all hover:bg-slate-800"
              >
                IMPRIMIR TICKET
              </button>
              <button onClick={() => setIsTicketOpen(false)} className="mt-2 w-full text-slate-400 py-1 text-[10px] no-print uppercase font-black">Cerrar</button>
            </div>
          </div>
        )}

        {/* MODAL USUARIO AVANZADO */}
        {isUserModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm no-print">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-200">
               <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
                  <div className="flex items-center gap-3"><ShieldCheck size={24} className="text-blue-400" /><h3 className="font-black uppercase tracking-tighter italic text-lg">{editingUser ? 'Editar Perfil' : 'Nuevo Usuario'}</h3></div>
                  <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-white transition-all"><X size={24}/></button>
               </div>
               <form className="p-8" onSubmit={e => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const selectedPerms = PERMISSIONS_LIST.map(p => p.id).filter(id => fd.get(`perm_${id}`));
                  
                  const newUser: User = {
                    id: editingUser?.id || `u${Date.now()}`,
                    name: fd.get('name') as string,
                    username: fd.get('username') as string,
                    password: (fd.get('password') as string) || editingUser?.password,
                    securityQuestion: fd.get('securityQuestion') as string,
                    securityAnswer: fd.get('securityAnswer') as string,
                    role: fd.get('role') as Role,
                    active: fd.get('active') === 'on',
                    permissions: selectedPerms
                  };

                  setUsers(prev => editingUser ? prev.map(u => u.id === newUser.id ? newUser : u) : [...prev, newUser]);
                  setIsUserModalOpen(false);
               }}>
                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="space-y-4">
                      <div><label className="text-[9px] font-black uppercase text-slate-400 ml-2">Nombre Completo</label><input required name="name" defaultValue={editingUser?.name} className="w-full p-4 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500" /></div>
                      <div><label className="text-[9px] font-black uppercase text-slate-400 ml-2">Usuario de Acceso</label><input required name="username" defaultValue={editingUser?.username} className="w-full p-4 border-2 border-slate-100 rounded-2xl font-mono outline-none focus:border-blue-500" /></div>
                      <div><label className="text-[9px] font-black uppercase text-slate-400 ml-2">Contraseña</label><input type="password" name="password" placeholder={editingUser ? 'Dejar en blanco para mantener' : 'Asignar contraseña'} required={!editingUser} className="w-full p-4 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500" /></div>
                    </div>
                    <div className="space-y-4">
                      <div><label className="text-[9px] font-black uppercase text-slate-400 ml-2">Rol del Sistema</label><select name="role" defaultValue={editingUser?.role || 'CASHIER'} className="w-full p-4 border-2 border-slate-100 rounded-2xl font-black uppercase outline-none focus:border-blue-500"><option value="ADMIN">ADMINISTRADOR</option><option value="MANAGER">GERENTE</option><option value="CASHIER">CAJERO / VENDEDOR</option></select></div>
                      <div><label className="text-[9px] font-black uppercase text-slate-400 ml-2">Estado de Cuenta</label><div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100"><input type="checkbox" name="active" defaultChecked={editingUser ? editingUser.active : true} disabled={editingUser?.username === 'admin'} className="w-5 h-5 accent-blue-600" /> <span className="font-black text-[10px] uppercase text-slate-600">Cuenta Activa</span></div></div>
                      <div className="space-y-1"><label className="text-[9px] font-black uppercase text-slate-400 ml-2 text-blue-600 flex items-center gap-1"><ShieldQuestion size={10}/> Recuperación</label><select name="securityQuestion" defaultValue={editingUser?.securityQuestion} className="w-full p-3 border border-slate-200 rounded-xl text-[10px] font-bold outline-none">{SECURITY_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}</select><input name="securityAnswer" placeholder="Respuesta secreta" defaultValue={editingUser?.securityAnswer} className="w-full p-3 border border-slate-200 rounded-xl text-[10px] font-bold outline-none" /></div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100 mb-8 max-h-[250px] overflow-y-auto custom-scrollbar">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 border-b pb-2 flex items-center gap-2"><Lock size={12}/> Perfil de Restricciones y Permisos</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {PERMISSIONS_LIST.map(p => (
                        <label key={p.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-500 cursor-pointer transition-all group">
                          <input type="checkbox" name={`perm_${p.id}`} defaultChecked={editingUser?.permissions.includes(p.id)} className="w-4 h-4 accent-blue-600" />
                          <div><p className="text-[9px] font-black uppercase text-slate-800 leading-none">{p.label}</p><p className="text-[7px] font-bold text-slate-400 uppercase mt-1">{p.group}</p></div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4"><button type="button" onClick={() => setIsUserModalOpen(false)} className="flex-1 py-5 rounded-2xl font-black uppercase text-xs text-slate-400 hover:text-slate-600">Cancelar</button><button className="flex-1 bg-slate-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3"><Save size={18}/> {editingUser ? 'Actualizar Perfil' : 'Crear Usuario'}</button></div>
               </form>
            </div>
          </div>
        )}

        {/* MODALES DE PRODUCTO, DEVOLUCIÓN, AUTH... (se mantienen sin cambios) */}
        {isProductModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 no-print">
             <div className="bg-white w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl">
                <div className="p-6 border-b font-black uppercase flex justify-between items-center bg-slate-50 text-slate-800"><div className="flex items-center gap-2 italic"><Package size={20} /> Ficha de Producto</div><button onClick={() => setIsProductModalOpen(false)} className="text-slate-400"><X/></button></div>
                <form className="p-8 space-y-4" onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); const p = { id: editingProduct?.id || `p${Date.now()}`, name: fd.get('name') as string, category: fd.get('category') as string, price: Number(fd.get('price')), cost: Number(fd.get('cost')), stock: Number(fd.get('stock')), minStock: Number(fd.get('minStock')), brand: fd.get('brand') as string, sku: fd.get('sku') as string }; setProducts(prev => editingProduct ? prev.map(x => x.id === p.id ? p : x) : [...prev, p]); setIsProductModalOpen(false); }}>
                   <input required name="name" placeholder="Descripción del Artículo" defaultValue={editingProduct?.name} className="w-full p-4 border-2 border-slate-100 rounded-2xl font-black uppercase" /><div className="grid grid-cols-2 gap-4"><input required name="sku" placeholder="SKU / Código" defaultValue={editingProduct?.sku} className="p-4 border-2 border-slate-100 rounded-2xl font-bold" /><input required name="brand" placeholder="Marca" defaultValue={editingProduct?.brand} className="p-4 border-2 border-slate-100 rounded-2xl font-bold uppercase" /></div>
                   <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Precio de Venta</label><input required type="number" step="0.01" name="price" placeholder="0.00" defaultValue={editingProduct?.price} className="w-full p-4 border-2 border-slate-100 rounded-2xl font-black text-blue-600" /></div><div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Costo Adquisición</label><input required type="number" step="0.01" name="cost" placeholder="0.00" defaultValue={editingProduct?.cost} className="w-full p-4 border-2 border-slate-100 rounded-2xl font-black text-slate-600" /></div></div>
                   <div className="grid grid-cols-2 gap-4"><div><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Stock Inicial</label><input required type="number" name="stock" placeholder="0" defaultValue={editingProduct?.stock} className="p-4 border-2 border-slate-100 rounded-2xl w-full font-bold" /></div><div><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Mín. Alerta</label><input required type="number" name="minStock" placeholder="0" defaultValue={editingProduct?.minStock} className="p-4 border-2 border-slate-100 rounded-2xl w-full font-bold" /></div></div>
                   <button className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl mt-4">Guardar Registro</button>
                </form>
             </div>
          </div>
        )}
        {isReturnModalOpen && selectedSaleForReturn && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm no-print">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-200">
               <div className="bg-orange-500 p-6 flex justify-between items-center text-white"><div className="flex items-center gap-3"><RotateCcw size={24} /><h3 className="font-black uppercase tracking-tighter text-lg italic">Procesar Devolución</h3></div><button onClick={() => setIsReturnModalOpen(false)} className="text-white/70 hover:text-white"><X size={24}/></button></div>
               <div className="p-8 space-y-6">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4"><p className="text-[10px] font-black text-slate-400 uppercase">Venta Seleccionada</p><p className="text-sm font-black text-slate-800 italic tracking-tighter">#{selectedSaleForReturn.id} | Total: ${selectedSaleForReturn.total.toFixed(2)}</p></div>
                  <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    {selectedSaleForReturn.items.map(item => {
                      const maxAvailable = item.quantity - (item.returnedQuantity || 0);
                      return (
                        <div key={item.productId} className="flex items-center justify-between p-4 bg-white border rounded-2xl">
                          <div className="flex-1"><p className="text-[10px] font-black uppercase italic truncate">{item.name}</p><p className="text-[8px] font-bold text-slate-400">VENDIDO: {item.quantity} | YA DEVUELTO: {item.returnedQuantity || 0}</p></div>
                          <div className="flex items-center gap-2"><label className="text-[10px] font-black text-orange-500">CANT:</label><input type="number" min="0" max={maxAvailable} className="w-16 p-2 border rounded-xl font-black text-center text-sm outline-none focus:border-orange-500" value={returnQuantities[item.productId] || 0} onChange={(e) => { const val = parseInt(e.target.value) || 0; setReturnQuantities({ ...returnQuantities, [item.productId]: Math.min(val, maxAvailable) }); }} /></div>
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={handleProcessReturn} className="w-full bg-orange-500 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Confirmar Devolución</button>
               </div>
            </div>
          </div>
        )}
        {isCardModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm no-print">
            <div className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl animate-in zoom-in duration-200">
               <div className="bg-slate-900 p-6 flex justify-between items-center text-white"><div className="flex items-center gap-3"><CreditCard size={24} className="text-blue-400" /><h3 className="font-black uppercase tracking-tighter text-lg italic">Confirmación Datafono</h3></div><button onClick={() => setIsCardModalOpen(false)} className="text-slate-400 hover:text-white"><X size={24}/></button></div>
               <div className="p-8 space-y-6">
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl text-center"><p className="text-[10px] font-black text-blue-400 uppercase mb-1">Monto de Transacción</p><p className="text-3xl font-black text-blue-700 italic tracking-tighter">${totalCart.toLocaleString()}</p></div>
                  <div className="space-y-4">
                     <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Franquicia</label><select className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-black text-sm outline-none focus:border-blue-500" value={tempCardDetails.brand} onChange={e => setTempCardDetails({...tempCardDetails, brand: e.target.value})}><option value="VISA">VISA</option><option value="MASTERCARD">MASTERCARD</option><option value="AMEX">AMERICAN EXPRESS</option><option value="DINERS">DINERS</option></select></div>
                     <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Últimos 4</label><input type="text" maxLength={4} placeholder="0000" className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-black text-center text-lg outline-none focus:border-blue-500" value={tempCardDetails.lastFour} onChange={e => setTempCardDetails({...tempCardDetails, lastFour: e.target.value.replace(/\D/g,'')})} /></div>
                        <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Autorización</label><input type="text" placeholder="######" className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-black text-center text-lg outline-none focus:border-blue-500 uppercase" value={tempCardDetails.authCode} onChange={e => setTempCardDetails({...tempCardDetails, authCode: e.target.value})} /></div>
                     </div>
                  </div>
                  <button onClick={() => completeSale(tempCardDetails)} disabled={tempCardDetails.lastFour.length < 4 || !tempCardDetails.authCode} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-30 transition-all">Validar Transacción</button>
               </div>
            </div>
          </div>
        )}
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 no-print">
            <div className="bg-white w-full max-w-sm rounded-3xl p-8 text-center border-t-4 border-red-500 shadow-2xl">
               <ShieldAlert size={48} className="mx-auto text-red-600 mb-4" /><h3 className="text-xl font-black uppercase mb-2">Seguridad Requerida</h3><p className="text-[10px] font-bold text-slate-400 uppercase mb-6">Esta operación requiere Código Maestro</p>
               <input type="password" placeholder="••••" className="w-full p-4 border-2 rounded-2xl text-center text-3xl font-black mb-4 tracking-[0.5em]" value={authInput} onChange={e => setAuthInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuthConfirm()} autoFocus /><div className="flex gap-2"><button onClick={() => {setIsAuthModalOpen(false); setAuthAction(null);}} className="flex-1 py-3 text-slate-400 uppercase font-black text-xs">Cancelar</button><button onClick={handleAuthConfirm} className="flex-1 py-3 bg-red-600 text-white rounded-xl uppercase font-black text-xs shadow-lg">Validar</button></div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        
        /* FIX DE IMPRESIÓN */
        @media print {
          .no-print, .no-print-backdrop { display: none !important; }
          body, html { height: auto !important; width: 100% !important; background: white !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; }
          main { margin-left: 0 !important; padding: 0 !important; width: 100% !important; display: block !important; }
          
          /* Área de Ticket (80mm) */
          .printable-area { 
            display: block !important; 
            position: absolute !important; 
            left: 50% !important; 
            top: 0 !important; 
            transform: translateX(-50%) !important; 
            width: 80mm !important; 
            margin: 0 !important; 
            padding: 5mm !important; 
            border: none !important; 
            box-shadow: none !important; 
            z-index: 9999 !important;
          }
          
          /* Área de Reporte Grande (A4) */
          .printable-area-large, .printable-area-medium {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 2cm !important;
            background: white !important;
            border: none !important;
            box-shadow: none !important;
            z-index: 9999 !important;
          }
          
          .print-content { display: block !important; }
          thead { display: table-header-group !important; }
          tr { page-break-inside: avoid !important; }
        }
      `}</style>
    </div>
  );
};

// --- COMPONENTES AUXILIARES ---
const LoginView = ({ onLogin, error }: any) => (<div className="min-h-screen flex items-center justify-center bg-slate-900 p-4"><div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl text-center"><div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-white font-black text-2xl italic mb-4">S</div><h1 className="text-2xl font-black uppercase italic mb-8 tracking-tighter">SportMaster POS Pro</h1><form onSubmit={onLogin} className="space-y-4">{error && <p className="text-red-500 text-[10px] font-black uppercase bg-red-50 p-2 rounded-xl border border-red-100">{error}</p>}<input required name="username" placeholder="admin" className="w-full p-4 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500" /><input required type="password" name="password" placeholder="admin" className="w-full p-4 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500" /><button className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all">Iniciar Sesión</button></form></div></div>);

const DashboardView = ({ sales, products, credits, customers, setActiveTab }: any) => {
  const today = new Date().toISOString().split('T')[0];
  const activeSales = sales.filter((s:any) => s.status !== 'VOIDED');
  const salesToday = activeSales.filter((s:any) => s.date.split('T')[0] === today).reduce((a:any, b:any) => a + b.total, 0);
  const totalStock = products.reduce((a:any, b:any) => a + b.stock, 0);
  const totalCredits = credits.reduce((a:any, b:any) => a + b.balance, 0);
  return (
    <div className="space-y-6 no-print">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-600 p-8 rounded-3xl text-white shadow-xl flex flex-col justify-between h-44"><p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Recaudo Diario</p><h4 className="text-4xl font-black italic tracking-tighter">${salesToday.toLocaleString()}</h4><div className="flex items-center gap-1 opacity-60 text-[8px] font-bold uppercase"><TrendingUp size={10}/> Cierre en curso</div></div>
        <div className="bg-white p-8 rounded-3xl border shadow-sm flex flex-col justify-between h-44"><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cuentas por Cobrar</p><h4 className="text-4xl font-black italic tracking-tighter text-slate-900">${totalCredits.toLocaleString()}</h4><div className="flex items-center gap-1 text-blue-500 text-[8px] font-bold uppercase"><Handshake size={10}/> Cartera Activa</div></div>
        <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl flex flex-col justify-between h-44"><p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Unidades en Stock</p><h4 className="text-4xl font-black italic tracking-tighter">{totalStock}</h4><div className="flex items-center gap-1 opacity-60 text-[8px] font-bold uppercase"><Package size={10}/> Inventario real</div></div>
      </div>
      <div className="bg-white p-8 rounded-3xl border shadow-sm"><h3 className="text-xl font-black uppercase italic mb-6 tracking-tighter flex items-center gap-2"><Clock size={20} className="text-blue-600"/> Monitor de Actividad</h3><div className="space-y-3">{activeSales.slice(0, 5).map((s:any) => (<div key={s.id} className={`flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all group`}><div className="flex items-center gap-4"><div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 font-black text-xs border shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">V</div><div><p className="text-[11px] font-black uppercase italic tracking-tighter text-slate-800">{customers.find((c:any) => c.id === s.customerId)?.name || 'Mostrador'}</p><p className="text-[8px] font-bold text-slate-400 uppercase">{new Date(s.date).toLocaleTimeString()} | {s.paymentMethod} {s.status === 'VOIDED' ? '(ANULADA)' : ''}</p></div></div><p className="font-black text-slate-900 text-lg tracking-tighter italic">${s.total.toLocaleString()}</p></div>))}</div></div>
    </div>
  );
};

const ReportsView = ({ sales, reportStartDate, setReportStartDate, reportEndDate, setReportEndDate, config, customers, products }: any) => {
  const [activeReportSubTab, setActiveReportSubTab] = useState<'RESUMEN' | 'LIBRO' | 'IMPUESTOS' | 'RENTABILIDAD'>('RESUMEN');
  
  const filtered = sales.filter((s:any) => s.date.split('T')[0] >= reportStartDate && s.date.split('T')[0] <= reportEndDate && s.status !== 'VOIDED');
  
  const metrics = useMemo(() => {
    let totalBruto = 0;
    let totalDescuentos = 0;
    let totalIVA = 0;
    let totalNeto = 0;
    let totalCosto = 0;
    let baseGravable = 0;
    const porMetodo: any = { EFECTIVO: 0, TARJETA: 0, TRANSFERENCIA: 0, CREDITO_PERSONAL: 0 };

    filtered.forEach(s => {
      totalBruto += s.subtotal;
      totalDescuentos += s.discountAmount;
      totalIVA += s.taxAmount;
      totalNeto += s.total;
      baseGravable += (s.subtotal - s.discountAmount);
      porMetodo[s.paymentMethod] += s.total;
      
      // Cálculo de COGS (Cost of Goods Sold)
      s.items.forEach((item: SaleItem) => {
        const prod = products.find((p: Product) => p.id === item.productId);
        if (prod) {
          totalCosto += (prod.cost * (item.quantity - (item.returnedQuantity || 0)));
        }
      });
    });

    const utilidadBruta = totalNeto - totalCosto;
    const margenUtilidad = totalNeto > 0 ? (utilidadBruta / totalNeto) * 100 : 0;

    return { totalBruto, totalDescuentos, totalIVA, totalNeto, totalCosto, baseGravable, porMetodo, utilidadBruta, margenUtilidad };
  }, [filtered, products]);

  const exportToCSV = (title: string, data: any[]) => {
    if (data.length === 0) return alert("No hay datos para exportar");
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => Object.values(row).join(",")).join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${title}_${reportStartDate}_${reportEndDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 report-print-container animate-in fade-in duration-500">
      {/* CABECERA DE FILTROS Y NAVEGACIÓN */}
      <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col lg:flex-row justify-between items-center gap-6 no-print">
        <div className="flex flex-col md:flex-row items-center gap-4 w-full lg:w-auto">
           <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
             {['RESUMEN', 'LIBRO', 'IMPUESTOS', 'RENTABILIDAD'].map(tab => (
               <button 
                key={tab} 
                onClick={() => setActiveReportSubTab(tab as any)} 
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${activeReportSubTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
               >
                 {tab}
               </button>
             ))}
           </div>
           <div className="h-10 w-px bg-slate-200 hidden md:block mx-2"></div>
           <div className="flex items-center gap-2">
              <input type="date" className="px-4 py-2 border rounded-xl text-xs font-black shadow-sm outline-none focus:ring-1 focus:ring-blue-500" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} />
              <ChevronRight size={14} className="text-slate-300"/>
              <input type="date" className="px-4 py-2 border rounded-xl text-xs font-black shadow-sm outline-none focus:ring-1 focus:ring-blue-500" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} />
           </div>
        </div>
        <div className="flex gap-2">
           <button onClick={() => window.print()} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 shadow-xl hover:bg-blue-600 transition-all"><Printer size={16}/> Imprimir PDF</button>
        </div>
      </div>

      {activeReportSubTab === 'RESUMEN' && (
        <div className="space-y-8">
          {/* TARJETAS DE MÉTRICAS CONTABLES */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="bg-white p-8 rounded-[2rem] border shadow-sm text-center border-b-4 border-b-blue-500">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest flex items-center justify-center gap-2"><DollarSign size={12}/> Ingresos Netos</p>
                <h4 className="text-3xl font-black text-slate-800 italic">${metrics.totalNeto.toLocaleString()}</h4>
             </div>
             <div className="bg-white p-8 rounded-[2rem] border shadow-sm text-center border-b-4 border-b-orange-500">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest flex items-center justify-center gap-2"><ArrowUpRight size={12}/> Costo de Venta (COGS)</p>
                <h4 className="text-3xl font-black text-slate-800 italic">${metrics.totalCosto.toLocaleString()}</h4>
             </div>
             <div className="bg-white p-8 rounded-[2rem] border shadow-sm text-center border-b-4 border-b-green-500">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest flex items-center justify-center gap-2"><Target size={12}/> Utilidad Bruta</p>
                <h4 className="text-3xl font-black text-green-600 italic">${metrics.utilidadBruta.toLocaleString()}</h4>
             </div>
             <div className="bg-slate-900 p-8 rounded-[2rem] shadow-2xl text-center text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><BadgePercent size={64}/></div>
                <p className="text-[10px] font-black uppercase opacity-60 mb-2 tracking-widest">Margen Bruto</p>
                <h4 className="text-4xl font-black italic tracking-tighter">{metrics.margenUtilidad.toFixed(1)}%</h4>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
                <h3 className="text-sm font-black uppercase italic mb-8 flex items-center gap-3 text-slate-700 border-b pb-6"><Wallet size={20} className="text-blue-600"/> Conciliación Medios de Pago</h3>
                <div className="space-y-4">
                   {Object.entries(metrics.porMetodo).map(([metodo, valor]: any) => (
                      <div key={metodo} className="flex justify-between items-center bg-slate-50 p-5 rounded-2xl border border-slate-100">
                         <span className="text-[11px] font-black text-slate-500 uppercase">{metodo.replace('_', ' ')}</span>
                         <span className="font-black text-slate-900 text-lg italic">${valor.toLocaleString()}</span>
                      </div>
                   ))}
                </div>
             </div>

             <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col justify-center text-center">
                <h3 className="text-sm font-black uppercase italic mb-8 flex items-center gap-3 text-slate-700 border-b pb-6"><Briefcase size={20} className="text-blue-600"/> Estado de Resultados</h3>
                <div className="space-y-6">
                   <div className="flex justify-between items-center pb-2 border-b border-slate-100"><span className="text-xs font-bold text-slate-400 uppercase">Ventas Totales</span><span className="font-black text-slate-800">${metrics.totalBruto.toLocaleString()}</span></div>
                   <div className="flex justify-between items-center pb-2 border-b border-slate-100"><span className="text-xs font-bold text-slate-400 uppercase">(-) Descuentos</span><span className="font-black text-red-500">-${metrics.totalDescuentos.toLocaleString()}</span></div>
                   <div className="flex justify-between items-center pb-2 border-b border-slate-100"><span className="text-xs font-bold text-slate-400 uppercase">(=) Venta Neta</span><span className="font-black text-slate-800">${(metrics.totalBruto - metrics.totalDescuentos).toLocaleString()}</span></div>
                   <div className="flex justify-between items-center pb-2 border-b border-slate-100"><span className="text-xs font-bold text-slate-400 uppercase">(-) Costo Mercancía (COGS)</span><span className="font-black text-orange-600">-${metrics.totalCosto.toLocaleString()}</span></div>
                   <div className="pt-4 flex justify-between items-center"><span className="text-sm font-black text-blue-600 uppercase">Utilidad de Operación</span><span className="text-2xl font-black italic tracking-tighter text-blue-600">${metrics.utilidadBruta.toLocaleString()}</span></div>
                </div>
             </div>
          </div>
        </div>
      )}

      {activeReportSubTab === 'LIBRO' && (
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm overflow-hidden">
          <div className="flex justify-between items-center mb-8 border-b pb-4">
            <h3 className="text-sm font-black uppercase italic text-slate-700 flex items-center gap-3"><FileText className="text-blue-600"/> Libro Auxiliar Diario de Ventas</h3>
            <button 
              onClick={() => exportToCSV("Libro_Diario", filtered.map(s => ({
                FECHA: new Date(s.date).toLocaleDateString(),
                FACTURA: s.id,
                CLIENTE: customers.find(c => c.id === s.customerId)?.name || "MOSTRADOR",
                SUBTOTAL: s.subtotal,
                IVA: s.taxAmount,
                DESCUENTO: s.discountAmount,
                TOTAL: s.total,
                METODO: s.paymentMethod
              })))}
              className="text-green-600 hover:text-green-700 flex items-center gap-1 font-black uppercase text-[9px]"
            >
              <FileSpreadsheet size={16}/> Exportar Excel
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b">
                <tr>
                  <th className="py-4 px-3">Fecha</th>
                  <th className="py-4 px-3">Factura</th>
                  <th className="py-4 px-3">Cliente</th>
                  <th className="py-4 px-3">Subtotal</th>
                  <th className="py-4 px-3">IVA</th>
                  <th className="py-4 px-3">Desc.</th>
                  <th className="py-4 px-3">Total</th>
                  <th className="py-4 px-3">Medio</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-bold">{new Date(s.date).toLocaleDateString()}</td>
                    <td className="py-3 px-3 font-mono text-slate-400">{s.id.slice(-6)}</td>
                    <td className="py-3 px-3 font-black uppercase text-slate-800">{customers.find(c => c.id === s.customerId)?.name || "MOSTRADOR"}</td>
                    <td className="py-3 px-3 font-bold">${s.subtotal.toFixed(2)}</td>
                    <td className="py-3 px-3 font-bold text-blue-500">${s.taxAmount.toFixed(2)}</td>
                    <td className="py-3 px-3 font-bold text-red-400">${s.discountAmount.toFixed(2)}</td>
                    <td className="py-3 px-3 font-black text-slate-900">${s.total.toFixed(2)}</td>
                    <td className="py-3 px-3 uppercase font-black text-[9px] text-slate-400">{s.paymentMethod.replace('_', ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeReportSubTab === 'IMPUESTOS' && (
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
           <h3 className="text-sm font-black uppercase italic mb-8 flex items-center gap-3 text-slate-700 border-b pb-6"><PieChart size={20} className="text-blue-600"/> Resumen de Impuestos (IVA Generado)</h3>
           <div className="space-y-8">
              <div className="grid grid-cols-2 gap-8">
                 <div className="bg-slate-50 p-6 rounded-3xl text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Base Gravable (19%)</p>
                    <p className="text-3xl font-black text-slate-800 italic">${metrics.baseGravable.toLocaleString()}</p>
                 </div>
                 <div className="bg-blue-50 p-6 rounded-3xl text-center border border-blue-100">
                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">IVA Recaudado (19%)</p>
                    <p className="text-3xl font-black text-blue-600 italic">${metrics.totalIVA.toLocaleString()}</p>
                 </div>
              </div>
              <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-100 flex gap-4 items-center">
                 <AlertTriangle size={24} className="text-yellow-600 shrink-0" />
                 <p className="text-[10px] font-bold text-yellow-800 uppercase leading-relaxed">Nota: Estos valores corresponden únicamente a las ventas registradas. Para su declaración oficial de impuestos, consulte con su contador la deducción del IVA descontable por compras.</p>
              </div>
           </div>
        </div>
      )}

      {activeReportSubTab === 'RENTABILIDAD' && (
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
           <h3 className="text-sm font-black uppercase italic mb-8 flex items-center gap-3 text-slate-700 border-b pb-6"><LineChart size={20} className="text-blue-600"/> Análisis de Rentabilidad por Operación</h3>
           <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                 <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 border-b">
                   <tr>
                     <th className="py-4 px-3">Factura</th>
                     <th className="py-4 px-3">Venta Neta</th>
                     <th className="py-4 px-3">Costo Operativo</th>
                     <th className="py-4 px-3">Margen Bruto</th>
                     <th className="py-4 px-3">% Rendimiento</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y">
                   {filtered.map(s => {
                      let saleCosto = 0;
                      s.items.forEach(it => {
                         const p = products.find(prod => prod.id === it.productId);
                         if (p) saleCosto += (p.cost * (it.quantity - (it.returnedQuantity || 0)));
                      });
                      const saleUtility = s.total - saleCosto;
                      const saleMargen = s.total > 0 ? (saleUtility / s.total) * 100 : 0;
                      
                      return (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                           <td className="py-3 px-3 font-mono">#{s.id.slice(-6)}</td>
                           <td className="py-3 px-3 font-black text-slate-800">${s.total.toFixed(2)}</td>
                           <td className="py-3 px-3 font-bold text-orange-600">${saleCosto.toFixed(2)}</td>
                           <td className={`py-3 px-3 font-black ${saleUtility > 0 ? 'text-green-600' : 'text-red-500'}`}>${saleUtility.toFixed(2)}</td>
                           <td className="py-3 px-3">
                              <span className={`px-2 py-1 rounded-lg font-black text-[10px] ${saleMargen > 20 ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                 {saleMargen.toFixed(1)}%
                              </span>
                           </td>
                        </tr>
                      );
                   })}
                 </tbody>
              </table>
           </div>
        </div>
      )}
    </div>
  );
};

const UsersManagerView = ({ users, setUsers, setIsUserModalOpen, setEditingUser }: any) => (
  <div className="bg-white p-10 rounded-[2.5rem] border shadow-sm no-print animate-in fade-in duration-500">
    <div className="flex justify-between items-center mb-10">
       <div><h3 className="text-2xl font-black uppercase italic flex items-center gap-3"><UserCheck className="text-blue-600" /> Control de Usuarios</h3><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Gestión de Accesos, Perfiles y Seguridad</p></div>
       <button onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }} className="bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 hover:bg-blue-700 transition-all active:scale-95"><Plus size={18}/> Nuevo Usuario</button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {users.map((u: User) => (
        <div key={u.id} className={`group p-8 bg-slate-50 border-2 rounded-[2.5rem] flex flex-col justify-between gap-8 transition-all relative overflow-hidden ${u.active === false ? 'opacity-60 border-red-100 grayscale-[0.5]' : 'border-transparent hover:bg-white hover:border-blue-500/20 hover:shadow-2xl'}`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">{u.active === false ? <UserX size={48} className="text-red-400" /> : <ShieldCheck size={48} className="text-blue-600" />}</div>
          <div>
            <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center text-white font-black shadow-sm group-hover:scale-110 transition-all ${u.active === false ? 'bg-slate-400' : 'bg-blue-600'}`}>{u.name.charAt(0).toUpperCase()}</div>
            <div className="flex items-center gap-2 mb-1"><p className="font-black uppercase italic text-slate-800 tracking-tighter text-xl truncate">{u.name}</p>{u.active === false && <span className="bg-red-500 text-white text-[7px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Inactivo</span>}</div>
            <div className="flex flex-col gap-1.5"><p className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5"><KeyRound size={10}/> {u.role}</p><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Users size={10}/> @{u.username}</p></div>
          </div>
          <div className="flex justify-end gap-2 border-t pt-6 border-slate-200">
            <button onClick={() => { if (u.username === 'admin') return alert("No se puede inactivar al administrador principal"); setUsers(users.map((usr: any) => usr.id === u.id ? { ...usr, active: !usr.active } : usr)); }} className={`p-3 rounded-xl border transition-all ${u.active === false ? 'bg-green-50 text-green-600 border-green-100 hover:bg-green-600 hover:text-white' : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200'}`} title={u.active === false ? 'Reactivar' : 'Inactivar'}>{u.active === false ? <ToggleRight size={16}/> : <ToggleLeft size={16}/>}</button>
            <button onClick={() => { setEditingUser(u); setIsUserModalOpen(true); }} className="bg-white text-blue-600 p-3 rounded-xl border border-slate-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Edit2 size={16}/></button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const CreditsView = ({ credits, customers, setIsPaymentModalOpen, setSelectedCredit, creditSearch, setCreditSearch, setIsHistoryModalOpen, handleCloseCreditManually, setIsGeneralCreditsReportOpen }: any) => {
  const filtered = credits.filter((c:any) => {
    const cust = customers.find((cus:any) => cus.id === c.customerId);
    return cust?.name.toLowerCase().includes(creditSearch.toLowerCase()) || c.id.toLowerCase().includes(creditSearch.toLowerCase());
  });
  return (
    <div className="bg-white p-10 rounded-[2.5rem] border shadow-sm no-print animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <div>
          <h3 className="text-2xl font-black uppercase italic flex items-center gap-3"><Handshake className="text-blue-600" /> Cartera de Créditos</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Control de Deudas y Abonos</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input type="text" placeholder="Buscar Cliente o ID..." className="w-full pl-12 pr-6 py-3 border-2 border-slate-100 rounded-2xl text-xs font-black uppercase outline-none focus:border-blue-500 transition-all" value={creditSearch} onChange={e => setCreditSearch(e.target.value)} />
          </div>
          <button onClick={() => setIsGeneralCreditsReportOpen(true)} className="bg-slate-900 text-white px-4 py-3 rounded-2xl flex items-center gap-2 hover:bg-blue-600 transition-all shadow-xl font-black text-[10px] uppercase">
             <FilePieChart size={18}/> Reporte Saldos
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-[10px] font-black uppercase border-b text-slate-400 tracking-widest">
            <tr>
              <th className="pb-5 px-4">Cliente</th>
              <th className="pb-5 px-4">Saldo Pendiente</th>
              <th className="pb-5 px-4">Total Inicial</th>
              <th className="pb-5 px-4">Vencimiento</th>
              <th className="pb-5 px-4">Estado</th>
              <th className="pb-5 px-4 text-right">Acciones de Gestión</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((c:Credit) => (
              <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${c.status === 'PAID' ? 'opacity-60' : ''}`}>
                <td className="py-5 px-4">
                  <p className="font-black uppercase italic text-slate-800 tracking-tighter text-base">{customers.find((cus:any) => cus.id === c.customerId)?.name || 'N/A'}</p>
                  <p className="text-[10px] font-mono text-slate-400 uppercase">Ref: {c.id.slice(-6)}</p>
                </td>
                <td className="py-5 px-4 font-black text-lg text-red-600 italic tracking-tighter">${c.balance.toLocaleString()}</td>
                <td className="py-5 px-4 font-bold text-slate-400 text-xs">${c.totalAmount.toLocaleString()}</td>
                <td className="py-5 px-4 text-xs font-bold text-slate-500 uppercase">{new Date(c.dueDate).toLocaleDateString()}</td>
                <td className="py-5 px-4">
                  <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest ${
                    c.status === 'PAID' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600 border border-orange-200'
                  }`}>
                    {c.status === 'PAID' ? 'LIQUIDADO' : 'PENDIENTE'}
                  </span>
                </td>
                <td className="py-5 px-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => { setSelectedCredit(c); setIsHistoryModalOpen(true); }} 
                      className="bg-white text-slate-400 p-3 rounded-xl border border-slate-100 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                      title="Ver Historial y Abonos"
                    >
                      <History size={16}/>
                    </button>
                    {c.status !== 'PAID' && (
                      <>
                        <button 
                          onClick={() => { setSelectedCredit(c); setIsPaymentModalOpen(true); }} 
                          className="bg-blue-600 text-white p-3 rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all hover:bg-blue-700"
                          title="Realizar Abono"
                        >
                          <DollarSign size={16}/>
                        </button>
                        <button 
                          onClick={() => handleCloseCreditManually(c)} 
                          className="bg-white text-green-600 p-3 rounded-xl border border-green-100 hover:bg-green-600 hover:text-white transition-all shadow-sm"
                          title="Cerrar Crédito Definitivo"
                        >
                          <CheckCircle2 size={16}/>
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="py-24 text-center font-black uppercase text-slate-300 tracking-[0.3em]">No se registran créditos en cartera</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CustomersView = ({ customers, setCustomers, setEditingCustomer, setIsCustomerModalOpen }: any) => (
  <div className="bg-white p-10 rounded-[2.5rem] border shadow-sm no-print">
    <div className="flex justify-between items-center mb-8"><div><h3 className="text-2xl font-black uppercase italic flex items-center gap-3"><Users className="text-blue-600" /> Directorio de Clientes</h3></div><button onClick={() => { setEditingCustomer(null); setIsCustomerModalOpen(true); }} className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2"><UserPlus size={16}/> Nuevo Cliente</button></div>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-[10px] font-black uppercase text-slate-400 tracking-widest"><tr><th className="pb-4">Nombre</th><th className="pb-4">NIT / ID</th><th className="pb-4 text-right">Acción</th></tr></thead><tbody className="divide-y">{customers.map((c:any) => (<tr key={c.id} className="hover:bg-slate-50 transition-colors"><td className="py-4 font-black uppercase italic tracking-tighter text-slate-800">{c.name}</td><td className="font-bold text-slate-500">{c.nit}</td><td className="text-right flex justify-end gap-1"><button onClick={() => { setEditingCustomer(c); setIsCustomerModalOpen(true); }} className="text-blue-500 p-2"><Edit2 size={16}/></button></td></tr>))}</tbody></table></div>
  </div>
);

const SettingsView = ({ config, setConfig, handleLogoUpload, logoInputRef, handleExportData, handleImportData, fileInputRef }: any) => (
  <div className="max-w-4xl space-y-6 no-print pb-20">
    <div className="bg-white p-10 rounded-[3rem] border shadow-sm">
      <h3 className="text-2xl font-black uppercase italic mb-10 tracking-tighter flex items-center gap-3"><Settings className="text-blue-600" /> Ajustes del Sistema</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-8">
           <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-[2rem] border-2 border-dashed">
              <div className="relative group">
                <div className="w-24 h-24 bg-white border rounded-[1.5rem] overflow-hidden flex items-center justify-center shadow-inner group-hover:border-blue-500 transition-all">
                  {config.logo ? <img src={config.logo} className="w-full h-full object-cover" /> : <ImageIcon size={32} className="text-slate-200" />}
                </div>
                <button onClick={() => logoInputRef.current?.click()} className="absolute -right-3 -bottom-3 bg-blue-600 text-white p-2.5 rounded-xl shadow-xl hover:scale-110 transition-all"><Camera size={18} /></button>
                <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
              </div>
              <div>
                <h4 className="font-black uppercase italic text-slate-800 tracking-tighter leading-none">Logotipo Comercial</h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-2 tracking-widest">Formatos: PNG, JPG, WEBP</p>
              </div>
           </div>

           <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2 mb-1 flex items-center gap-1"><Briefcase size={10}/> Nombre de la Empresa</label>
                <input className="w-full p-4 border-2 border-slate-100 rounded-2xl font-black uppercase outline-none focus:border-blue-500 transition-all" value={config.name} onChange={e => setConfig({...config, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-2 mb-1 flex items-center gap-1"><FileText size={10}/> NIT / Identificación</label>
                  <input className="w-full p-4 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all" value={config.nit} onChange={e => setConfig({...config, nit: e.target.value})} />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-2 mb-1 flex items-center gap-1"><Sparkles size={10}/> Slogan Comercial</label>
                  <input className="w-full p-4 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all" value={config.slogan} onChange={e => setConfig({...config, slogan: e.target.value})} />
                </div>
              </div>
           </div>
        </div>

        <div className="space-y-6">
           <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-6 flex items-center gap-2"><MapPin size={12}/> Información de Contacto</h4>
              <div className="space-y-4">
                 <div className="relative">
                    <label className="text-[8px] font-black uppercase text-slate-500 mb-1 block ml-1">Dirección Física</label>
                    <input className="w-full bg-slate-800 border-none p-4 rounded-xl font-bold text-sm text-slate-100 outline-none focus:ring-1 focus:ring-blue-500" value={config.address} onChange={e => setConfig({...config, address: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[8px] font-black uppercase text-slate-500 mb-1 block ml-1">Teléfono</label>
                      <input className="w-full bg-slate-800 border-none p-4 rounded-xl font-bold text-sm text-slate-100 outline-none focus:ring-1 focus:ring-blue-500" value={config.phone} onChange={e => setConfig({...config, phone: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[8px] font-black uppercase text-slate-500 mb-1 block ml-1">Correo Electrónico</label>
                      <input className="w-full bg-slate-800 border-none p-4 rounded-xl font-bold text-sm text-slate-100 outline-none focus:ring-1 focus:ring-blue-500" value={config.email} onChange={e => setConfig({...config, email: e.target.value})} />
                    </div>
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <button onClick={handleExportData} className="bg-white border hover:border-blue-500 p-5 rounded-2xl font-black uppercase text-[9px] flex flex-col items-center gap-3 transition-all text-slate-600 shadow-sm"><Download size={20} className="text-blue-500"/> Generar Backup JSON</button>
              <button onClick={() => fileInputRef.current?.click()} className="bg-white border hover:border-green-500 p-5 rounded-2xl font-black uppercase text-[9px] flex flex-col items-center gap-3 transition-all text-slate-600 shadow-sm"><Upload size={20} className="text-green-500"/> Restaurar desde JSON</button>
              <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportData} />
           </div>
        </div>
      </div>

      {/* SECCIÓN ACERCA DE */}
      <div className="mt-16 pt-10 border-t border-slate-100">
         <div className="flex items-center gap-2 text-slate-400 mb-6">
            <Info size={18}/>
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em]">Acerca del Sistema</h4>
         </div>
         <div className="bg-blue-50/50 p-10 rounded-[3rem] border border-blue-100 flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden group">
            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-30 group-hover:bg-blue-400 transition-all duration-700"></div>
            <div className="relative z-10 flex items-center gap-6">
               <div className="w-20 h-20 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-white font-black text-2xl italic shadow-2xl group-hover:rotate-12 transition-all">FS</div>
               <div>
                  <h5 className="text-lg font-black uppercase italic tracking-tighter text-slate-900">Diseño y Programación</h5>
                  <p className="text-xl font-bold text-blue-600">Jesus Maldonado</p>
                  <div className="flex items-center gap-4 mt-3">
                     <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest"><Mail size={12} className="text-slate-400"/> fastsystems.es.tl@gmail.com</span>
                     <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest"><Globe size={12} className="text-slate-400"/> Santa Marta - Colombia</span>
                  </div>
               </div>
            </div>
            <div className="relative z-10 text-right">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mb-1">Versión del Kernel</p>
               <p className="text-2xl font-black text-slate-900 italic tracking-tighter">v3.2.0-PRO</p>
               <p className="text-[8px] font-bold text-blue-500 uppercase tracking-widest mt-2 bg-blue-100 px-3 py-1 rounded-full inline-block">Licencia Autorizada</p>
            </div>
         </div>
      </div>
    </div>
  </div>
);

export default App;
