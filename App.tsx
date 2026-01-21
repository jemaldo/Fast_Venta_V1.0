
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
  History,
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
  Image as ImageIconLucide
} from 'lucide-react';
import { Product, Sale, Customer, StoreConfig, User, SaleItem, Role, Credit, CreditPayment, CreditStatus } from './types';
import { INITIAL_PRODUCTS, INITIAL_STORE_CONFIG, INITIAL_USER, SECURITY_QUESTIONS } from './constants';
import { getInventoryAdvice } from './geminiService';
import { getData, saveData } from './dbService';

const AUTH_CODE = "03102010Asd*"; 

const PERMISSIONS_LIST = [
  { id: 'VIEW_DASHBOARD', label: 'Ver Dashboard', group: 'General' },
  { id: 'PROCESS_SALES', label: 'Procesar Ventas (POS)', group: 'Ventas' },
  { id: 'VOID_SALES', label: 'Anular Ventas', group: 'Ventas' },
  { id: 'VIEW_INVENTORY', label: 'Ver Inventario', group: 'Inventario' },
  { id: 'EDIT_INVENTORY', label: 'Gestionar Productos', group: 'Inventario' },
  { id: 'MANAGE_CUSTOMERS', label: 'Gestionar Clientes', group: 'General' },
  { id: 'VIEW_REPORTS', label: 'Ver Informes Contables', group: 'Reportes' },
  { id: 'MANAGE_USERS', label: 'Control de Usuarios', group: 'Admin' },
  { id: 'EDIT_SETTINGS', label: 'Configuración Tienda', group: 'Admin' },
  { id: 'MANAGE_BACKUP', label: 'Copias de Seguridad', group: 'Admin' },
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
    { ...INITIAL_USER, permissions: PERMISSIONS_LIST.map(p => p.id) }
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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [authInput, setAuthInput] = useState('');
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  
  // --- Modales Crédito ---
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);

  // --- IA Advisor ---
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // --- Filtros ---
  const [inventorySearch, setInventorySearch] = useState('');
  const [posSearch, setPosSearch] = useState('');
  const [creditSearch, setCreditSearch] = useState('');
  
  // --- POS ---
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>(customers[0]);
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO_PERSONAL'>('EFECTIVO');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(0);

  // --- Informes ---
  const [reportStartDate, setReportStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportCustomerFilter, setReportCustomerFilter] = useState('ALL');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const importInventoryRef = useRef<HTMLInputElement>(null);
  const importCustomersRef = useRef<HTMLInputElement>(null);
  const posSearchInputRef = useRef<HTMLInputElement>(null);

  // --- Persistencia con IndexedDB ---
  useEffect(() => {
    const loadAllData = async () => {
      try {
        const [p, s, cr, co, cu, u] = await Promise.all([
          getData('products'),
          getData('sales'),
          getData('credits'),
          getData('config'),
          getData('customers'),
          getData('users')
        ]);
        if (p) setProducts(p);
        if (s) setSales(s);
        if (cr) setCredits(cr);
        if (co) setConfig(co);
        if (cu) setCustomers(cu);
        if (u) setUsers(u);
        setIsDataLoaded(true);
      } catch (e) {
        console.error("Error cargando IndexedDB:", e);
        setIsDataLoaded(true);
      }
    };
    loadAllData();
  }, []);

  // Guardado automático en IndexedDB cuando cambian los estados
  useEffect(() => { if (isDataLoaded) saveData('products', products); }, [products]);
  useEffect(() => { if (isDataLoaded) saveData('sales', sales); }, [sales]);
  useEffect(() => { if (isDataLoaded) saveData('credits', credits); }, [credits]);
  useEffect(() => { if (isDataLoaded) saveData('config', config); }, [config]);
  useEffect(() => { if (isDataLoaded) saveData('customers', customers); }, [customers]);
  useEffect(() => { if (isDataLoaded) saveData('users', users); }, [users]);

  useEffect(() => {
    setTaxPercent(selectedCustomer.isIvaResponsible ? 19 : 0);
  }, [selectedCustomer]);

  // --- Manejo de Lector de Código de Barras ---
  const handleBarcodeSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const sku = posSearch.trim();
      const product = products.find(p => p.sku.toUpperCase() === sku.toUpperCase());
      
      if (product) {
        addToCart(product);
        setPosSearch(''); // Limpiar para el siguiente escaneo
      } else {
        // Si no es un SKU exacto, quizás el usuario solo buscaba texto, dejamos que la lista filtrada actúe
      }
    }
  };

  // --- Sistema de Login ---
  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const username = fd.get('username') as string;
    const password = fd.get('password') as string;

    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      setCurrentUser(user);
      setIsLoggedIn(true);
      setLoginError('');
      setActiveTab('dashboard');
    } else {
      setLoginError('Usuario o contraseña incorrectos.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setActiveTab('pos');
  };

  const handleRecoverPassword = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const username = fd.get('username') as string;
    const answer = fd.get('answer') as string;
    const newPassword = fd.get('newPassword') as string;

    const user = users.find(u => u.username === username);
    if (!user) return alert("Usuario no encontrado.");
    
    if (user.securityAnswer?.toLowerCase() === answer.toLowerCase()) {
      setUsers(users.map(u => u.username === username ? { ...u, password: newPassword } : u));
      alert("Contraseña restablecida correctamente. Inicie sesión.");
      setIsRecoveryOpen(false);
    } else {
      alert("Respuesta incorrecta.");
    }
  };

  // --- Utilidades de Exportación/Importación ---
  const downloadCSVTemplate = (headers: string[], filename: string) => {
    const content = headers.join(",") + "\n";
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.click();
  };

  const handleImportInventory = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length <= 1) return alert("El archivo está vacío o no tiene datos.");
      
      const newProducts: Product[] = lines.slice(1).map(line => {
        const v = line.split(",").map(val => val.trim());
        return {
          id: v[0] || Date.now().toString() + Math.random().toString(36).substr(2, 5),
          name: v[1] || "Sin nombre",
          brand: v[2] || "Genérica",
          category: v[3] || "Otros",
          price: parseFloat(v[4]) || 0,
          cost: parseFloat(v[5]) || 0,
          stock: parseInt(v[6]) || 0,
          minStock: parseInt(v[7]) || 0,
          sku: v[8] || `SKU-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
        };
      });
      
      if (confirm(`¿Importar ${newProducts.length} productos? Los SKUs existentes podrían duplicarse si no se manejan con cuidado.`)) {
        setProducts([...products, ...newProducts]);
        alert("Importación de inventario completada.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const handleImportCustomers = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length <= 1) return alert("El archivo está vacío.");
      
      const newCustomers: Customer[] = lines.slice(1).map(line => {
        const v = line.split(",").map(val => val.trim());
        return {
          id: v[0] || Date.now().toString() + Math.random().toString(36).substr(2, 5),
          name: v[1] || "Cliente Nuevo",
          nit: v[2] || "000",
          email: v[3] || "",
          phone: v[4] || "",
          address: v[5] || "",
          isIvaResponsible: v[6]?.toLowerCase() === 'true'
        };
      });
      
      if (confirm(`¿Importar ${newCustomers.length} clientes?`)) {
        setCustomers([...customers, ...newCustomers]);
        alert("Importación de clientes completada.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const canAccess = (feature: string): boolean => {
    const permMap: { [key: string]: string } = {
      dashboard: 'VIEW_DASHBOARD',
      pos: 'PROCESS_SALES',
      inventory: 'VIEW_INVENTORY',
      customers: 'MANAGE_CUSTOMERS',
      reports: 'VIEW_REPORTS',
      users: 'MANAGE_USERS',
      settings: 'EDIT_SETTINGS',
      credits: 'MANAGE_CREDITS'
    };
    const requiredPerm = permMap[feature];
    if (!requiredPerm) return true;
    return currentUser.permissions.includes(requiredPerm) || currentUser.permissions.includes('ALL');
  };

  const handleExportData = () => {
    if (!currentUser.permissions.includes('MANAGE_BACKUP') && !currentUser.permissions.includes('ALL')) return alert('Sin permiso.');
    const dataStr = JSON.stringify({ products, sales, credits, config, customers, users }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_sportmaster_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (confirm('¿Restaurar todos los datos?')) {
          setProducts(imported.products || []);
          setSales(imported.sales || []);
          setCredits(imported.credits || []);
          setConfig(imported.config || INITIAL_STORE_CONFIG);
          setCustomers(imported.customers || []);
          setUsers(imported.users || users);
          alert('Datos importados.');
        }
      } catch { alert('Error al importar.'); }
    };
    reader.readAsText(file);
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setConfig({ ...config, logo: result });
    };
    reader.readAsDataURL(file);
  };

  // --- Handlers ---
  const handleSaveProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const pData: Product = {
      id: editingProduct?.id || Date.now().toString(),
      name: fd.get('name') as string,
      brand: fd.get('brand') as string,
      category: fd.get('category') as string,
      price: parseFloat(fd.get('price') as string),
      cost: parseFloat(fd.get('cost') as string),
      stock: parseInt(fd.get('stock') as string),
      minStock: parseInt(fd.get('minStock') as string),
      sku: fd.get('sku') as string,
    };
    setProducts(editingProduct ? products.map(p => p.id === pData.id ? pData : p) : [...products, pData]);
    setIsProductModalOpen(false);
  };

  const handleSaveCustomer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const cData: Customer = {
      id: editingCustomer?.id || Date.now().toString(),
      name: fd.get('name') as string,
      nit: fd.get('nit') as string,
      email: fd.get('email') as string,
      phone: fd.get('phone') as string,
      address: fd.get('address') as string,
      isIvaResponsible: fd.get('isIvaResponsible') === 'true',
    };
    setCustomers(editingCustomer ? customers.map(c => c.id === cData.id ? cData : c) : [...customers, cData]);
    setIsCustomerModalOpen(false);
  };

  const handleSaveUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const selectedPerms: string[] = [];
    PERMISSIONS_LIST.forEach(p => { if (fd.get(`perm_${p.id}`) === 'on') selectedPerms.push(p.id); });
    const uData: User = {
      id: editingUser?.id || Date.now().toString(),
      name: fd.get('name') as string,
      username: fd.get('username') as string,
      password: (fd.get('password') as string) || editingUser?.password || '1234',
      securityQuestion: fd.get('securityQuestion') as string,
      securityAnswer: fd.get('securityAnswer') as string,
      role: fd.get('role') as Role,
      permissions: selectedPerms,
    };
    setUsers(editingUser ? users.map(u => u.id === uData.id ? uData : u) : [...users, uData]);
    setIsUserModalOpen(false);
  };

  const addToCart = (p: Product) => {
    if (p.stock <= 0) return alert('Sin stock.');
    setCart(prev => {
      const ex = prev.find(i => i.productId === p.id);
      if (ex) return prev.map(i => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { productId: p.id, name: p.name, price: p.price, quantity: 1 }];
    });
  };

  const completeSale = () => {
    if (cart.length === 0) return;
    const sale: Sale = {
      id: `V${Date.now()}`,
      date: new Date().toISOString(),
      items: [...cart],
      subtotal: subtotalCart,
      taxAmount: taxVal,
      discountAmount: discountVal,
      total: totalCart,
      userId: currentUser.id,
      customerId: selectedCustomer.id,
      paymentMethod
    };
    
    if (paymentMethod === 'CREDITO_PERSONAL') {
      const newCredit: Credit = {
        id: `CR${Date.now()}`,
        saleId: sale.id,
        customerId: selectedCustomer.id,
        totalAmount: totalCart,
        balance: totalCart,
        status: 'ACTIVE',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        payments: []
      };
      setCredits([newCredit, ...credits]);
    }

    setSales([sale, ...sales]);
    setProducts(prev => prev.map(p => {
      const item = cart.find(i => i.productId === p.id);
      return item ? { ...p, stock: p.stock - item.quantity } : p;
    }));
    setLastSale(sale);
    setCart([]);
    setDiscountPercent(0);
    setIsTicketOpen(true);
  };

  const handleAddPayment = () => {
    if (!selectedCredit || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0 || amount > selectedCredit.balance) {
      alert("Monto inválido.");
      return;
    }
    const newPayment: CreditPayment = {
      id: `P${Date.now()}`,
      date: new Date().toISOString(),
      amount: amount,
      method: 'EFECTIVO'
    };
    const updatedBalance = selectedCredit.balance - amount;
    const updatedStatus: CreditStatus = updatedBalance <= 0 ? 'PAID' : selectedCredit.status;
    setCredits(prev => prev.map(c => c.id === selectedCredit.id ? { ...c, balance: updatedBalance, status: updatedStatus, payments: [...c.payments, newPayment] } : c));
    setIsPaymentModalOpen(false);
    setPaymentAmount('');
    setSelectedCredit(null);
  };

  const confirmDeleteSale = () => {
    if (authInput !== AUTH_CODE) return alert('Código incorrecto.');
    if (!saleToDelete) return;
    setProducts(prev => prev.map(p => {
      const item = saleToDelete.items.find(i => i.productId === p.id);
      return item ? { ...p, stock: p.stock + item.quantity } : p;
    }));
    setSales(prev => prev.filter(s => s.id !== saleToDelete.id));
    setCredits(prev => prev.filter(c => c.saleId !== saleToDelete.id));
    setIsAuthModalOpen(false);
    setSaleToDelete(null);
  };

  const subtotalCart = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
  const discountVal = subtotalCart * (discountPercent / 100);
  const taxVal = (subtotalCart - discountVal) * (taxPercent / 100);
  const totalCart = subtotalCart - discountVal + taxVal;

  // --- Views ---

  const UsersManagerView = () => (
    <div className="bg-white p-6 rounded-2xl border shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-black italic uppercase flex items-center gap-2"><UserCheck /> Gestión de Personal</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Niveles de Acceso y Credenciales</p>
        </div>
        <button onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg">
          <UserPlus size={18} /> Nuevo Acceso
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
            <tr>
              <th className="pb-4">Colaborador</th>
              <th className="pb-4">Username</th>
              <th className="pb-4">Rol</th>
              <th className="pb-4">Privilegios</th>
              <th className="pb-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-4">
                  <p className="font-black uppercase italic tracking-tighter text-slate-800">{u.name}</p>
                  <p className="text-[8px] font-bold text-slate-300 uppercase">PWD: ****</p>
                </td>
                <td className="py-4 font-mono text-xs text-slate-500">@{u.username}</td>
                <td className="py-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 
                    u.role === 'MANAGER' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                  }`}>{u.role}</span>
                </td>
                <td className="py-4">
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {u.permissions.length === PERMISSIONS_LIST.length ? (
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Control Total</span>
                    ) : u.permissions.slice(0, 3).map(p => (
                      <span key={p} className="bg-slate-50 border px-1.5 py-0.5 rounded text-[8px] font-bold text-slate-500 uppercase">{p.split('_').pop()}</span>
                    ))}
                    {u.permissions.length > 3 && <span className="text-[8px] font-bold text-blue-500">+{u.permissions.length - 3}</span>}
                  </div>
                </td>
                <td className="py-4 text-right">
                  <button onClick={() => { setEditingUser(u); setIsUserModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                  {u.id !== currentUser.id && u.id !== INITIAL_USER.id && (
                    <button onClick={() => setUsers(users.filter(usr => usr.id !== u.id))} className="p-2 text-slate-300 hover:text-red-500 rounded-lg"><Trash2 size={16} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const LoginView = () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="p-10 pt-12 text-center bg-slate-50 border-b relative overflow-hidden">
           <div className="relative z-10">
             <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center text-white font-black text-3xl italic shadow-xl shadow-blue-500/20 mb-6">S</div>
             <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Sport Master</h1>
             <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mt-2 italic">Professional POS System</p>
           </div>
           <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
             <ShoppingCart size={180} />
           </div>
        </div>
        <div className="p-10">
          {!isRecoveryOpen ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Username (@)</label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input required name="username" placeholder="admin" className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 font-bold outline-none focus:border-blue-500 bg-slate-50 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input required type="password" name="password" placeholder="••••••••" className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 font-bold outline-none focus:border-blue-500 bg-slate-50 transition-all" />
                </div>
              </div>
              {loginError && <p className="text-xs font-bold text-red-500 italic text-center animate-bounce">{loginError}</p>}
              <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all">Ingresar al Sistema</button>
              <button type="button" onClick={() => setIsRecoveryOpen(true)} className="w-full text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline text-center block">¿Olvidaste tu contraseña?</button>
            </form>
          ) : (
            <form onSubmit={handleRecoverPassword} className="space-y-6 animate-in slide-in-from-right duration-300">
               <div className="flex items-center gap-2 mb-2 text-blue-600">
                 <ShieldQuestion size={20} />
                 <h3 className="font-black uppercase italic tracking-tighter">Recuperar Acceso</h3>
               </div>
               <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Username (@)</label>
                <input required name="username" className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 font-bold outline-none focus:border-blue-500 bg-slate-50" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Respuesta Secreta</label>
                <input required name="answer" placeholder="Respuesta personalizada..." className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 font-bold outline-none focus:border-blue-500 bg-slate-50" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nueva Contraseña</label>
                <input required type="password" name="newPassword" placeholder="••••••••" className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 font-bold outline-none focus:border-blue-500 bg-slate-50" />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-200 active:scale-95 transition-all">Restablecer y Volver</button>
              <button type="button" onClick={() => setIsRecoveryOpen(false)} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Regresar al Login</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  const InventoryView = () => {
    const handleGetAdvice = async () => {
      setIsAiLoading(true);
      try {
        const advice = await getInventoryAdvice(products);
        setAiAdvice(advice);
      } catch (error) {
        alert("Error IA.");
      } finally {
        setIsAiLoading(false);
      }
    };
    const filteredInventory = products.filter(p => p.name.toLowerCase().includes(inventorySearch.toLowerCase()) || p.sku.toLowerCase().includes(inventorySearch.toLowerCase()));

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div>
              <h3 className="text-xl font-black italic uppercase flex items-center gap-2"><Package className="text-blue-600" /> Stock Actual</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Control de Existencias y Precios</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <input type="text" placeholder="Buscar SKU..." className="pl-4 pr-4 py-2 bg-slate-50 border rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500" value={inventorySearch} onChange={(e) => setInventorySearch(e.target.value)} />
              
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                <button 
                  onClick={() => downloadCSVTemplate(['id', 'nombre', 'marca', 'categoria', 'precio', 'costo', 'stock', 'minStock', 'sku'], 'plantilla_inventario.csv')} 
                  className="p-2 text-slate-600 hover:bg-white hover:text-blue-600 rounded-lg transition-all" 
                  title="Descargar Plantilla"
                >
                  <FileDown size={18} />
                </button>
                <button 
                  onClick={() => importInventoryRef.current?.click()} 
                  className="p-2 text-slate-600 hover:bg-white hover:text-green-600 rounded-lg transition-all" 
                  title="Carga Masiva"
                >
                  <UploadCloud size={18} />
                </button>
                <input type="file" ref={importInventoryRef} className="hidden" accept=".csv" onChange={handleImportInventory} />
              </div>

              <button onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }} className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm shadow-lg hover:bg-slate-800 transition-all"><Plus size={18} /> Nuevo</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[10px] font-black text-slate-400 uppercase border-b">
                <tr>
                  <th className="pb-4">Producto / Marca</th>
                  <th className="pb-4">Categoría</th>
                  <th className="pb-4 text-right">Costo</th>
                  <th className="pb-4 text-right">Precio</th>
                  <th className="pb-4 text-center">Stock</th>
                  <th className="pb-4 text-right">Gestión</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredInventory.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4">
                      <p className="font-black uppercase italic text-slate-800 tracking-tighter">{p.name}</p>
                      <p className="text-[9px] text-slate-400 uppercase">SKU: {p.sku} | {p.brand}</p>
                    </td>
                    <td className="py-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-black uppercase">{p.category}</span>
                    </td>
                    <td className="py-4 text-right font-bold text-slate-400">${p.cost.toFixed(2)}</td>
                    <td className="py-4 text-right font-black text-blue-600">${p.price.toFixed(2)}</td>
                    <td className="py-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${p.stock <= p.minStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{p.stock}</span>
                    </td>
                    <td className="py-4 text-right space-x-2">
                      <button onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                      <button onClick={() => setProducts(products.filter(item => item.id !== p.id))} className="p-2 text-slate-300 hover:text-red-500 rounded-lg"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-blue-600 p-8 rounded-3xl shadow-xl text-white relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4"><Sparkles className="text-yellow-400" /><h3 className="text-xl font-black uppercase italic">Consultor IA</h3></div>
            <p className="text-sm opacity-80 mb-6 max-w-xl font-medium">Análisis de stock y sugerencias estratégicas basadas en tus existencias actuales.</p>
            <button onClick={handleGetAdvice} disabled={isAiLoading} className="bg-white text-blue-700 px-6 py-3 rounded-2xl font-black uppercase text-xs disabled:opacity-50 hover:bg-blue-50 transition-all">{isAiLoading ? 'Analizando...' : 'Analizar Inventario'}</button>
            {aiAdvice && (
              <div className="mt-6 p-6 bg-white/10 backdrop-blur-md rounded-2xl text-sm italic border border-white/20 animate-in fade-in slide-in-from-bottom-4">
                {aiAdvice}
              </div>
            )}
          </div>
          <Sparkles className="absolute -right-12 -bottom-12 text-white/5 w-64 h-64 rotate-12" />
        </div>
      </div>
    );
  };

  const ReportsView = () => {
    const filteredSales = sales.filter(s => {
      const saleDate = s.date.split('T')[0];
      return saleDate >= reportStartDate && saleDate <= reportEndDate && (reportCustomerFilter === 'ALL' || s.customerId === reportCustomerFilter);
    });

    const totalRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0);
    const totalTax = filteredSales.reduce((acc, s) => acc + s.taxAmount, 0);
    const subtotalBruto = filteredSales.reduce((acc, s) => acc + s.subtotal, 0);
    
    const totalCost = filteredSales.reduce((acc, s) => {
      const saleItemsCost = s.items.reduce((itemAcc, item) => {
        const prod = products.find(p => p.id === item.productId);
        return itemAcc + ((prod?.cost || 0) * item.quantity);
      }, 0);
      return acc + saleItemsCost;
    }, 0);

    const netProfit = totalRevenue - totalCost - totalTax;

    const handleExportToExcel = () => {
      const headers = ['Factura', 'Fecha', 'Cliente', 'Subtotal', 'IVA', 'Descuento', 'Total', 'Metodo Pago'];
      const rows = filteredSales.map(s => {
        const cust = customers.find(c => c.id === s.customerId);
        return [
          s.id,
          new Date(s.date).toLocaleString(),
          cust?.name || 'Mostrador',
          s.subtotal.toFixed(2),
          s.taxAmount.toFixed(2),
          s.discountAmount.toFixed(2),
          s.total.toFixed(2),
          s.paymentMethod
        ];
      });

      const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `informe_contable_${reportStartDate}_al_${reportEndDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="bg-white p-6 rounded-2xl border shadow-sm print:hidden">
          <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Rango Inicial</label>
                <input type="date" className="w-full p-2.5 border rounded-xl font-bold text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Rango Final</label>
                <input type="date" className="w-full p-2.5 border rounded-xl font-bold text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Filtrar por Cliente</label>
                <select className="w-full p-2.5 border rounded-xl font-bold text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" value={reportCustomerFilter} onChange={(e) => setReportCustomerFilter(e.target.value)}>
                  <option value="ALL">Todos los Clientes</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleExportToExcel} className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg hover:bg-green-700 transition-all">
                <FileSpreadsheet size={16} /> Exportar Excel
              </button>
              <button onClick={() => window.print()} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg hover:bg-slate-800 transition-all">
                <Printer size={16} /> Generar Impresión
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex flex-col justify-between">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Total Ingresos (Bruto)</p>
              <h4 className="text-3xl font-black text-blue-700 tracking-tighter italic">${totalRevenue.toLocaleString()}</h4>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Costo Mercancía (Est.)</p>
              <h4 className="text-3xl font-black text-slate-600 tracking-tighter italic">${totalCost.toLocaleString()}</h4>
            </div>
            <div className="bg-green-50 p-6 rounded-3xl border border-green-100 flex flex-col justify-between">
              <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">Utilidad Operativa</p>
              <h4 className="text-3xl font-black text-green-700 tracking-tighter italic">${netProfit.toLocaleString()}</h4>
            </div>
            <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 flex flex-col justify-between">
              <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">IVA Recaudado</p>
              <h4 className="text-3xl font-black text-orange-600 tracking-tighter italic">${totalTax.toLocaleString()}</h4>
            </div>
          </div>
        </div>

        <div className="bg-white p-10 rounded-3xl border shadow-sm report-print-container">
          <div className="hidden print:block mb-8 text-center border-b pb-6">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">{config.name}</h2>
            <p className="text-sm font-bold text-slate-500">NIT: {config.nit}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">INFORME CONTABLE DE VENTAS</p>
            <p className="text-[10px] text-slate-400 mt-2">Periodo: {reportStartDate} al {reportEndDate}</p>
          </div>
          
          <h3 className="text-sm font-black uppercase italic tracking-widest text-slate-800 mb-6 flex items-center gap-2">
            <BarChart3 size={18} className="text-blue-600" /> Detalle de Operaciones en Periodo
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[10px] font-black uppercase border-b tracking-widest text-slate-400">
                <tr>
                  <th className="pb-4">Folio / Fecha</th>
                  <th className="pb-4">Cliente</th>
                  <th className="pb-4">Método</th>
                  <th className="pb-4 text-right">Subtotal</th>
                  <th className="pb-4 text-right">IVA</th>
                  <th className="pb-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {filteredSales.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-slate-400 italic font-medium">No se encontraron registros en este periodo</td></tr>
                ) : filteredSales.map(s => {
                  const cust = customers.find(c => c.id === s.customerId);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 font-bold">
                        <p className="text-blue-600 uppercase">#{s.id.slice(-8)}</p>
                        <p className="text-[9px] text-slate-400">{new Date(s.date).toLocaleString()}</p>
                      </td>
                      <td className="py-4 font-black uppercase italic tracking-tighter text-slate-700">
                        {cust?.name || 'Venta de Mostrador'}
                      </td>
                      <td className="py-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-bold uppercase text-[8px] text-slate-500">
                          {s.paymentMethod.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 font-bold text-right text-slate-500">${s.subtotal.toLocaleString()}</td>
                      <td className="py-4 font-bold text-right text-orange-500">${s.taxAmount.toLocaleString()}</td>
                      <td className="py-4 font-black text-right text-slate-900 text-sm tracking-tighter">${s.total.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
              {filteredSales.length > 0 && (
                <tfoot className="bg-slate-900 text-white rounded-b-2xl">
                  <tr className="font-black">
                    <td colSpan={3} className="py-6 px-4 text-xs uppercase tracking-widest italic">Totales Consolidados</td>
                    <td className="py-6 text-right">${subtotalBruto.toLocaleString()}</td>
                    <td className="py-6 text-right text-orange-300">${totalTax.toLocaleString()}</td>
                    <td className="py-6 text-right pr-4 text-lg tracking-tighter italic text-blue-400">${totalRevenue.toLocaleString()}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    );
  };

  // --- Views de Cartera (Créditos) ---
  const CreditManagerView = () => {
    const filteredCredits = credits.filter(c => {
      const customer = customers.find(cust => cust.id === c.customerId);
      const search = creditSearch.toLowerCase();
      return (
        customer?.name.toLowerCase().includes(search) ||
        c.id.toLowerCase().includes(search) ||
        customer?.nit.toLowerCase().includes(search)
      );
    });

    return (
      <div className="bg-white p-6 rounded-2xl border shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div>
            <h3 className="text-xl font-black italic uppercase flex items-center gap-2"><Handshake className="text-blue-600" /> Cartera de Clientes</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Créditos y Cuentas por Cobrar</p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
              <input 
                type="text" 
                placeholder="Buscar cliente/folio..." 
                className="pl-9 pr-4 py-2 bg-slate-50 border rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500 w-64" 
                value={creditSearch} 
                onChange={(e) => setCreditSearch(e.target.value)} 
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-[10px] font-black text-slate-400 uppercase border-b">
              <tr>
                <th className="pb-4">Referencia / Vencimiento</th>
                <th className="pb-4">Cliente</th>
                <th className="pb-4 text-right">Monto Inicial</th>
                <th className="pb-4 text-right">Saldo</th>
                <th className="pb-4 text-center">Estado</th>
                <th className="pb-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {filteredCredits.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-slate-400 italic">No hay créditos registrados</td></tr>
              ) : filteredCredits.map(c => {
                const customer = customers.find(cust => cust.id === c.customerId);
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4">
                      <p className="font-black uppercase italic tracking-tighter text-slate-800">#{c.id.slice(-6)}</p>
                      <p className={`text-[8px] font-bold uppercase ${new Date(c.dueDate) < new Date() && c.status !== 'PAID' ? 'text-red-500' : 'text-slate-400'}`}>
                        Vence: {new Date(c.dueDate).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="py-4">
                      <p className="font-black uppercase italic tracking-tighter text-slate-700">{customer?.name}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">NIT: {customer?.nit}</p>
                    </td>
                    <td className="py-4 text-right font-bold text-slate-400">${c.totalAmount.toLocaleString()}</td>
                    <td className="py-4 text-right font-black text-blue-600">${c.balance.toLocaleString()}</td>
                    <td className="py-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        c.status === 'PAID' ? 'bg-green-100 text-green-700' : 
                        c.status === 'OVERDUE' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>{c.status}</span>
                    </td>
                    <td className="py-4 text-right space-x-1">
                      <button 
                        onClick={() => { setSelectedCredit(c); setIsPaymentModalOpen(true); }} 
                        disabled={c.status === 'PAID'}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-30" 
                        title="Registrar Pago"
                      >
                        <Banknote size={16} />
                      </button>
                      <button 
                        onClick={() => { setStatementCustomer(customer || null); setIsStatementOpen(true); }}
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-lg" 
                        title="Ver Extracto"
                      >
                        <FileText size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const Sidebar = () => (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col fixed h-full z-20 border-r border-slate-800 print:hidden">
      <div className="p-8">
        <div className="flex items-center gap-3 text-white mb-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-blue-900/40">
            {config.logo ? <img src={config.logo} alt="Logo" className="w-full h-full object-cover rounded-xl" /> : 'S'}
          </div>
          <div><h1 className="font-black text-2xl tracking-tighter italic">SPORT</h1><p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Master POS Pro</p></div>
        </div>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'pos', label: 'Caja Registradora', icon: ShoppingCart },
          { id: 'inventory', label: 'Inventario Pro', icon: Package },
          { id: 'credits', label: 'Cartera y Créditos', icon: Handshake },
          { id: 'customers', label: 'Clientes', icon: Users },
          { id: 'reports', label: 'Informes Contables', icon: BarChart3 },
          { id: 'users', label: 'Gestión Usuarios', icon: UserCheck },
          { id: 'settings', label: 'Administración', icon: Settings },
        ].map(item => canAccess(item.id) && (
          <button 
            key={item.id} 
            onClick={() => setActiveTab(item.id)} 
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${
              activeTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon size={18} />
            <span className="font-bold text-sm tracking-tight">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="p-6 border-t border-slate-800 space-y-3">
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 flex flex-col gap-1">
          <p className="text-[10px] font-black text-white uppercase tracking-tighter truncate">{currentUser.name}</p>
          <p className="text-[8px] text-blue-400 font-black uppercase tracking-widest">{currentUser.role}</p>
        </div>
        <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
          <LogOut size={14} /> Cerrar Sesión
        </button>
      </div>
    </aside>
  );

  if (!isLoggedIn) return <LoginView />;

  return (
    <div className="flex min-h-screen bg-slate-50 selection:bg-blue-100">
      <Sidebar />
      <main className="ml-64 flex-1 p-8 print:ml-0 print:p-0">
        <header className="flex justify-between items-center mb-10 print:hidden">
          <div><h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">{activeTab.replace('_', ' ').toUpperCase()}</h2><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 italic">{config.slogan}</p></div>
          <div className="bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="text-right">
              <p className="text-[9px] text-slate-400 font-black tracking-widest">{config.nit}</p>
              <p className="text-sm font-black text-slate-800">{config.name}</p>
            </div>
            <div className="w-10 h-10 rounded-xl overflow-hidden border shadow-inner bg-slate-50 flex items-center justify-center">
              {config.logo ? <img src={config.logo} alt="Logo" className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-slate-300" />}
            </div>
          </div>
        </header>

        {activeTab === 'pos' && (
          <div className="grid grid-cols-12 gap-6 h-[calc(100vh-140px)]">
            <div className="col-span-8 flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  ref={posSearchInputRef}
                  type="text" 
                  placeholder="Escanear Código de Barras o Buscar..." 
                  className="w-full pl-10 pr-12 py-3 rounded-xl border font-black uppercase text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" 
                  value={posSearch} 
                  onChange={(e) => setPosSearch(e.target.value)} 
                  onKeyDown={handleBarcodeSubmit}
                  autoFocus
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <ScanBarcode size={20} className="text-blue-500 animate-pulse" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 overflow-y-auto pr-2 custom-scrollbar">
                {products.filter(p => 
                  p.name.toLowerCase().includes(posSearch.toLowerCase()) || 
                  p.sku.toLowerCase().includes(posSearch.toLowerCase())
                ).map(product => (
                  <button 
                    key={product.id} 
                    onClick={() => addToCart(product)} 
                    disabled={product.stock <= 0}
                    className="bg-white p-4 rounded-2xl border text-left hover:border-blue-500 hover:shadow-md transition-all flex flex-col h-48 relative group"
                  >
                    <div className="flex-1 bg-slate-50 rounded-xl mb-3 flex items-center justify-center border group-hover:bg-white transition-colors overflow-hidden">
                      <Package size={32} className="text-slate-200" />
                      {product.stock <= 0 && <div className="absolute inset-0 bg-white/60 flex items-center justify-center font-black text-red-500 text-[10px] uppercase">Sin Stock</div>}
                    </div>
                    <h4 className="font-black text-slate-800 text-[10px] uppercase truncate italic tracking-tighter leading-none">{product.name}</h4>
                    <div className="flex justify-between items-end mt-2">
                      <p className="font-black text-blue-600 text-lg tracking-tighter leading-none">${product.price.toFixed(2)}</p>
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${product.stock > product.minStock ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>Stock: {product.stock}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-4 flex flex-col gap-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">Cliente Asignado</label>
                <div className="flex gap-2">
                  <select 
                    className="flex-1 bg-slate-50 border rounded-xl px-3 py-2 text-xs font-black uppercase outline-none" 
                    value={selectedCustomer.id} 
                    onChange={(e) => setSelectedCustomer(customers.find(c => c.id === e.target.value) || customers[0])}
                  >
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button onClick={() => { setEditingCustomer(null); setIsCustomerModalOpen(true); }} className="p-2 bg-slate-100 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><UserPlus size={18} /></button>
                </div>
              </div>
              <div className="flex-1 bg-white rounded-2xl shadow-lg border border-slate-200 flex flex-col overflow-hidden">
                <div className="p-4 border-b bg-slate-50 font-black text-[10px] uppercase italic tracking-widest flex justify-between">
                  <span>Carrito de Venta</span>
                  <span className="text-blue-600">{cart.reduce((a, b) => a + b.quantity, 0)} Items</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/20">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 grayscale"><ShoppingCart size={40} /><p className="text-[9px] font-black uppercase mt-2">Vacío</p></div>
                  ) : cart.map(item => (
                    <div key={item.productId} className="flex justify-between items-center bg-white p-3 rounded-xl border shadow-sm">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-[10px] font-black text-slate-800 uppercase italic truncate">{item.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold">${item.price.toFixed(2)} x {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-slate-900">${(item.price * item.quantity).toFixed(2)}</span>
                        <button onClick={() => setCart(cart.filter(i => i.productId !== item.productId))} className="text-red-300 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Descuento (%)</label>
                    <div className="relative">
                      <Percent className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300" size={10} />
                      <input 
                        type="number" 
                        min="0" 
                        max="100" 
                        className="w-full pl-6 pr-2 py-1.5 border rounded-lg text-[10px] font-black outline-none focus:ring-1 focus:ring-blue-500" 
                        value={discountPercent} 
                        onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)} 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">IVA (%)</label>
                    <div className="relative">
                      <Coins className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300" size={10} />
                      <input 
                        type="number" 
                        min="0" 
                        max="100" 
                        className="w-full pl-6 pr-2 py-1.5 border rounded-lg text-[10px] font-black outline-none focus:ring-1 focus:ring-blue-500" 
                        value={taxPercent} 
                        onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)} 
                      />
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-slate-900 text-white space-y-4">
                  <div className="space-y-1 text-[10px] font-bold text-slate-400 mb-2">
                    <div className="flex justify-between"><span>Subtotal</span><span>${subtotalCart.toFixed(2)}</span></div>
                    {discountVal > 0 && <div className="flex justify-between text-red-400"><span>Desc. ({discountPercent}%)</span><span>-${discountVal.toFixed(2)}</span></div>}
                    {taxVal > 0 && <div className="flex justify-between text-blue-400"><span>IVA ({taxPercent}%)</span><span>+${taxVal.toFixed(2)}</span></div>}
                  </div>
                  <div className="flex justify-between font-black text-2xl border-b border-slate-800 pb-3 tracking-tighter italic">
                    <span className="text-slate-400">TOTAL</span>
                    <span className="text-blue-400">${totalCart.toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[{id:'EFECTIVO', icon:Banknote}, {id:'TARJETA', icon:CreditCard}, {id:'TRANSFERENCIA', icon:ArrowRightLeft}, {id:'CREDITO_PERSONAL', icon:Handshake}].map(m => (
                      <button 
                        key={m.id} 
                        onClick={() => setPaymentMethod(m.id as any)} 
                        className={`p-2.5 rounded-xl text-[8px] font-black uppercase border flex items-center justify-center gap-2 transition-all ${
                          paymentMethod === m.id ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/40' : 'bg-slate-800 border-slate-700 text-slate-500'
                        }`}
                      >
                        <m.icon size={12} /> {m.id.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={completeSale} 
                    disabled={cart.length === 0} 
                    className="w-full bg-blue-500 hover:bg-blue-400 text-slate-900 py-4 rounded-xl font-black disabled:opacity-20 uppercase tracking-widest text-sm shadow-xl transition-all active:scale-[0.98]"
                  >
                    REGISTRAR VENTA
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && <InventoryView />}
        {activeTab === 'credits' && <CreditManagerView />}
        {activeTab === 'reports' && <ReportsView />}
        {activeTab === 'users' && <UsersManagerView />}
        
        {activeTab === 'customers' && (
          <div className="bg-white p-6 rounded-3xl border shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
              <div>
                <h3 className="text-xl font-black uppercase italic flex items-center gap-3"><Users className="text-blue-600" /> Base de Datos de Clientes</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gestión de Terceros y Responsabilidades</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                  <button 
                    onClick={() => downloadCSVTemplate(['id', 'nombre', 'nit', 'email', 'telefono', 'direccion', 'responsableIVA(true/false)'], 'plantilla_clientes.csv')} 
                    className="p-2 text-slate-600 hover:bg-white hover:text-blue-600 rounded-lg transition-all" 
                    title="Descargar Plantilla"
                  >
                    <FileDown size={18} />
                  </button>
                  <button 
                    onClick={() => importCustomersRef.current?.click()} 
                    className="p-2 text-slate-600 hover:bg-white hover:text-green-600 rounded-lg transition-all" 
                    title="Carga Masiva"
                  >
                    <UploadCloud size={18} />
                  </button>
                  <input type="file" ref={importCustomersRef} className="hidden" accept=".csv" onChange={handleImportCustomers} />
                </div>
                <button onClick={() => { setEditingCustomer(null); setIsCustomerModalOpen(true); }} className="bg-blue-600 text-white px-5 py-2.5 rounded-2xl font-black flex items-center gap-2 shadow-lg text-xs uppercase tracking-widest hover:bg-blue-700 transition-all">
                  <UserPlus size={18} /> Nuevo Cliente
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-[10px] font-black uppercase border-b text-slate-400 tracking-widest">
                  <tr><th className="pb-4">Nombre / Razón Social</th><th className="pb-4">Identificación</th><th className="pb-4">Contacto</th><th className="pb-4">Dirección</th><th className="pb-4 text-right">Gestión</th></tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {customers.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 font-black uppercase italic tracking-tighter text-slate-800">{c.name}</td>
                      <td className="py-4 font-mono text-xs">{c.nit}</td>
                      <td className="py-4">
                        <p className="font-bold text-slate-700">{c.phone}</p>
                        <p className="text-[9px] text-slate-400 font-medium lowercase">{c.email}</p>
                      </td>
                      <td className="py-4 text-[10px] uppercase font-bold text-slate-400 italic">{c.address}</td>
                      <td className="py-4 text-right space-x-2">
                        <button onClick={() => { setEditingCustomer(c); setIsCustomerModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                        <button onClick={() => setCustomers(customers.filter(cu => cu.id !== c.id))} className="p-2 text-slate-300 hover:text-red-500 rounded-lg"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-4xl space-y-8 pb-12">
            <div className="bg-white p-8 rounded-3xl border shadow-sm">
              <h3 className="text-xl font-black uppercase italic mb-8 flex items-center gap-3"><Settings className="text-blue-600" /> Parámetros Globales</h3>
              
              <div className="mb-10 flex flex-col md:flex-row items-center gap-8 bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-200">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-3xl border-2 border-slate-200 bg-white shadow-inner flex items-center justify-center overflow-hidden">
                    {config.logo ? (
                      <img src={config.logo} alt="Logo Tienda" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={48} className="text-slate-200" />
                    )}
                  </div>
                  <button 
                    onClick={() => logoInputRef.current?.click()}
                    className="absolute -right-3 -bottom-3 bg-blue-600 text-white p-3 rounded-2xl shadow-xl hover:bg-blue-700 transition-all hover:scale-110"
                  >
                    <Camera size={18} />
                  </button>
                  <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                </div>
                <div className="text-center md:text-left">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Identidad Visual</p>
                  <h4 className="text-lg font-black uppercase italic tracking-tighter">Logotipo de la Empresa</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 leading-relaxed max-w-xs">Se recomienda una imagen cuadrada de al menos 400x400px para una visualización óptima en tickets e informes.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1.5 tracking-widest">Nombre Comercial de la Tienda</label>
                  <input className="w-full p-3.5 border rounded-2xl font-black italic outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 uppercase" value={config.name} onChange={e => setConfig({...config, name: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1.5 tracking-widest">Identificación Tributaria (NIT)</label>
                  <input className="w-full p-3.5 border rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" value={config.nit} onChange={e => setConfig({...config, nit: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1.5 tracking-widest">Teléfono de Contacto</label>
                  <input className="w-full p-3.5 border rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" value={config.phone} onChange={e => setConfig({...config, phone: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1.5 tracking-widest">Dirección Física</label>
                  <input className="w-full p-3.5 border rounded-2xl font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" value={config.address} onChange={e => setConfig({...config, address: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1.5 tracking-widest">Slogan Comercial</label>
                  <input className="w-full p-3.5 border rounded-2xl font-black italic outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" value={config.slogan} onChange={e => setConfig({...config, slogan: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-4 pt-8">
                <button onClick={() => alert('Parámetros guardados con éxito.')} className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase flex items-center gap-2 shadow-xl hover:bg-slate-800 transition-all"><Save size={16} /> Guardar Cambios</button>
              </div>
            </div>

            <div className="bg-orange-50 p-8 rounded-3xl border border-orange-200">
              <h3 className="text-xl font-black text-orange-700 uppercase italic mb-4 flex items-center gap-3"><Database /> Copias de Seguridad</h3>
              <p className="text-[11px] font-bold text-orange-800 uppercase tracking-tight mb-8">Administre el resguardo externo de su base de datos local (IndexedDB)</p>
              <div className="flex gap-4">
                <button onClick={handleExportData} className="flex-1 bg-white border-2 border-orange-200 p-6 rounded-2xl font-black uppercase text-[10px] flex flex-col items-center gap-3 hover:border-orange-500 transition-all shadow-sm">
                  <Download className="text-orange-500" size={24} /> Exportar JSON de Respaldo
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-white border-2 border-orange-200 p-6 rounded-2xl font-black uppercase text-[10px] flex flex-col items-center gap-3 hover:border-orange-500 transition-all shadow-sm">
                  <Upload className="text-orange-500" size={24} /> Restaurar desde Archivo
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportData} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-2xl h-44 flex flex-col justify-between relative overflow-hidden group">
                <p className="text-[10px] font-black uppercase opacity-60 tracking-widest z-10">Ventas Registradas Hoy</p>
                <h4 className="text-4xl font-black italic tracking-tighter z-10">${sales.filter(s=>s.date.split('T')[0] === new Date().toISOString().split('T')[0]).reduce((a,b)=>a+b.total, 0).toLocaleString()}</h4>
                <div className="text-[9px] font-bold opacity-60 uppercase z-10 flex items-center gap-1"><TrendingUp size={10} /> Movimiento Diario Proyectado</div>
                <ShoppingCart className="absolute -right-4 -bottom-4 text-white/10 w-32 h-32 group-hover:scale-110 transition-transform" />
              </div>
              <div className="bg-white p-6 rounded-3xl border shadow-sm h-44 flex flex-col justify-between relative overflow-hidden group">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest z-10">Total Stock Inventario</p>
                <h4 className="text-4xl font-black italic tracking-tighter text-slate-800 z-10">{products.reduce((a,b)=>a+b.stock, 0).toLocaleString()}</h4>
                <div className="text-[9px] font-bold text-slate-400 uppercase z-10">Unidades Disponibles</div>
                <Package className="absolute -right-4 -bottom-4 text-slate-50 w-32 h-32 group-hover:rotate-12 transition-transform" />
              </div>
              <div className="bg-white p-6 rounded-3xl border shadow-sm h-44 flex flex-col justify-between border-red-100 relative overflow-hidden group">
                <p className="text-[10px] font-black uppercase text-red-400 tracking-widest z-10">Alertas de Stock Bajo</p>
                <h4 className="text-4xl font-black italic tracking-tighter text-red-600 z-10">{products.filter(p=>p.stock<=p.minStock).length}</h4>
                <div className="text-[9px] font-bold text-red-300 uppercase z-10">Reposición Urgente</div>
                <History className="absolute -right-4 -bottom-4 text-red-50/50 w-32 h-32 group-hover:rotate-12 transition-transform" />
              </div>
              <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-xl h-44 flex flex-col justify-between relative overflow-hidden group">
                <p className="text-[10px] font-black uppercase opacity-60 tracking-widest z-10">Balance en Cartera</p>
                <h4 className="text-4xl font-black italic tracking-tighter z-10">${credits.reduce((a,c)=>a+c.balance, 0).toLocaleString()}</h4>
                <div className="text-[9px] font-bold opacity-60 uppercase z-10 flex items-center gap-1"><Handshake size={10} /> Cuentas x Cobrar</div>
                <DollarSign className="absolute -right-4 -bottom-4 text-white/5 w-32 h-32 group-hover:scale-110 transition-transform" />
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
               <div className="space-y-4">
                 <h3 className="text-2xl font-black uppercase italic tracking-tighter">Últimos Movimientos de Caja</h3>
                 <div className="space-y-3">
                   {sales.slice(0, 5).map(s => (
                     <div key={s.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-blue-200 transition-all">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-black text-[10px]">V</div>
                         <div>
                            <p className="text-[10px] font-black uppercase italic tracking-tighter">{customers.find(c => c.id === s.customerId)?.name}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">{new Date(s.date).toLocaleTimeString()}</p>
                         </div>
                       </div>
                       <p className="font-black text-slate-900 text-sm tracking-tighter">${s.total.toLocaleString()}</p>
                     </div>
                   ))}
                 </div>
               </div>
               <div className="bg-slate-50 p-8 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                 <div className="w-16 h-16 bg-blue-600 rounded-2xl shadow-xl shadow-blue-200 flex items-center justify-center text-white mb-4 animate-bounce">
                    <Sparkles size={32} />
                 </div>
                 <h4 className="text-xl font-black uppercase italic mb-2 tracking-tighter">Análisis de Almacenamiento</h4>
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-tight mb-6 leading-relaxed italic">SportMaster ahora utiliza IndexedDB para garantizar que tus datos estén seguros y sin límites de espacio.</p>
                 <button onClick={() => setActiveTab('inventory')} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg">Ir a Inventario</button>
               </div>
            </div>
          </div>
        )}

        {/* Modales Compartidos */}
        {isProductModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Ficha Técnica de Producto</h3>
                <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400"><X size={24} /></button>
              </div>
              <form onSubmit={handleSaveProduct} className="p-8 grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Descripción del Artículo</label>
                  <input required name="name" defaultValue={editingProduct?.name} className="w-full px-4 py-3.5 rounded-2xl border font-black uppercase outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5 tracking-widest">Referencia / SKU (Para Lector)</label>
                  <input required name="sku" defaultValue={editingProduct?.sku} className="w-full px-4 py-3.5 rounded-2xl border font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5 tracking-widest">Marca / Proveedor</label>
                  <input required name="brand" defaultValue={editingProduct?.brand} className="w-full px-4 py-3.5 rounded-2xl border font-bold bg-slate-50 uppercase outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5 tracking-widest">Categoría</label>
                  <select name="category" defaultValue={editingProduct?.category} className="w-full px-4 py-3.5 rounded-2xl border font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="Fútbol">Fútbol</option>
                    <option value="Running">Running</option>
                    <option value="Fitness">Fitness</option>
                    <option value="Ropa">Ropa</option>
                    <option value="Accesorios">Accesorios</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5 tracking-widest">Precio de Venta (PVP)</label>
                  <input required type="number" step="0.01" name="price" defaultValue={editingProduct?.price} className="w-full px-4 py-3.5 rounded-2xl border font-black text-blue-600 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5 tracking-widest">Costo de Adquisición</label>
                  <input required type="number" step="0.01" name="cost" defaultValue={editingProduct?.cost} className="w-full px-4 py-3.5 rounded-2xl border font-bold text-slate-600 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5 tracking-widest">Stock Inicial</label>
                    <input required type="number" name="stock" defaultValue={editingProduct?.stock} className="w-full px-4 py-3.5 rounded-2xl border font-bold bg-slate-50" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5 tracking-widest">Min. Alerta</label>
                    <input required type="number" name="minStock" defaultValue={editingProduct?.minStock} className="w-full px-4 py-3.5 rounded-2xl border font-bold bg-slate-50" />
                  </div>
                </div>
                <button type="submit" className="col-span-2 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest mt-4 shadow-xl shadow-slate-200">Guardar Registro de Producto</button>
              </form>
            </div>
          </div>
        )}

        {isUserModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-800 uppercase italic">Control de Acceso de Usuario</h3>
                <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400"><X size={24} /></button>
              </div>
              <form onSubmit={handleSaveUser} className="p-8 space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Nombre del Colaborador</label>
                    <input required name="name" defaultValue={editingUser?.name} className="w-full px-4 py-3.5 rounded-2xl border font-black uppercase bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Username (@)</label>
                    <input required name="username" defaultValue={editingUser?.username} className="w-full px-4 py-3.5 rounded-2xl border font-bold bg-slate-50" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 p-4 bg-blue-50/50 rounded-3xl border border-blue-100">
                  <div>
                    <label className="block text-[10px] font-black text-blue-600 uppercase mb-1.5">Establecer Contraseña</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300" size={16} />
                      <input type="password" name="password" placeholder={editingUser ? "Dejar en blanco para no cambiar" : "Contraseña inicial"} className="w-full pl-10 pr-4 py-3 rounded-xl border font-bold outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-blue-600 uppercase mb-1.5">Rol del Sistema</label>
                    <select name="role" defaultValue={editingUser?.role || 'CASHIER'} className="w-full px-4 py-3 rounded-xl border font-bold outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="ADMIN">ADMIN</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="CASHIER">CASHIER</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4 p-4 border-2 border-dashed rounded-3xl">
                   <div className="flex items-center gap-2 text-slate-800">
                     <ShieldQuestion size={18} className="text-slate-400" />
                     <h4 className="text-[10px] font-black uppercase tracking-widest">Seguridad de Recuperación</h4>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Pregunta Secreta</label>
                       <select name="securityQuestion" defaultValue={editingUser?.securityQuestion} className="w-full px-3 py-2.5 rounded-xl border text-xs font-bold bg-slate-50">
                          {SECURITY_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                       </select>
                     </div>
                     <div>
                       <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Respuesta Secreta</label>
                       <input name="securityAnswer" defaultValue={editingUser?.securityAnswer} placeholder="Respuesta única..." className="w-full px-3 py-2.5 rounded-xl border text-xs font-bold bg-slate-50" />
                     </div>
                   </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-3">Privilegios del Sistema</label>
                  <div className="grid grid-cols-2 gap-3">
                    {PERMISSIONS_LIST.map(p => (
                      <label key={p.id} className="flex items-center gap-3 p-3 rounded-xl border-2 hover:bg-slate-50 cursor-pointer transition-all">
                        <input type="checkbox" name={`perm_${p.id}`} defaultChecked={editingUser?.permissions.includes(p.id) || editingUser?.permissions.includes('ALL')} className="w-4 h-4 rounded text-blue-600" />
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-800">{p.label}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">{p.group}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl">Confirmar Perfil de Acceso</button>
              </form>
            </div>
          </div>
        )}

        {isCustomerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Registro de Cliente / Tercero</h3>
                <button onClick={() => setIsCustomerModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>
              <form onSubmit={handleSaveCustomer} className="p-8 space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Nombre Completo / Razón Social</label>
                  <input required name="name" defaultValue={editingCustomer?.name} className="w-full px-4 py-3.5 rounded-2xl border font-black uppercase outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">NIT / Identificación</label>
                    <input required name="nit" defaultValue={editingCustomer?.nit} className="w-full px-4 py-3.5 rounded-2xl border font-bold bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Teléfono Móvil</label>
                    <input required name="phone" defaultValue={editingCustomer?.phone} className="w-full px-4 py-3.5 rounded-2xl border font-bold bg-slate-50" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Correo Electrónico</label>
                  <input required type="email" name="email" defaultValue={editingCustomer?.email} className="w-full px-4 py-3.5 rounded-2xl border font-bold bg-slate-50 lowercase" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Dirección de Envío / Oficina</label>
                  <input required name="address" defaultValue={editingCustomer?.address} className="w-full px-4 py-3.5 rounded-2xl border font-bold bg-slate-50 uppercase" />
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border-2 border-dashed">
                   <label className="block text-[10px] font-black text-slate-400 uppercase mb-3">Tributación</label>
                   <div className="flex gap-4">
                      <label className="flex items-center gap-2 font-bold text-xs"><input type="radio" name="isIvaResponsible" value="true" defaultChecked={editingCustomer?.isIvaResponsible === true} /> Responsable IVA</label>
                      <label className="flex items-center gap-2 font-bold text-xs"><input type="radio" name="isIvaResponsible" value="false" defaultChecked={editingCustomer?.isIvaResponsible !== true} /> Simplificado</label>
                   </div>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-100">Registrar Cliente</button>
              </form>
            </div>
          </div>
        )}

        {isAuthModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl text-center">
              <Lock size={32} className="mx-auto text-red-600 mb-4" />
              <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-800">Autorización de Seguridad</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-6">Ingrese el código para anular el registro de venta</p>
              <input 
                type="password" 
                className="w-full p-4 border-2 rounded-2xl text-center font-black text-2xl mb-4 outline-none focus:border-red-600" 
                value={authInput} 
                onChange={(e) => setAuthInput(e.target.value)} 
                autoFocus 
              />
              <div className="flex gap-2">
                <button onClick={() => { setIsAuthModalOpen(false); setAuthInput(''); }} className="flex-1 py-3 text-slate-400 font-black uppercase text-[10px]">Cancelar</button>
                <button onClick={confirmDeleteSale} className="flex-1 py-3 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-red-200">Confirmar Anulación</button>
              </div>
            </div>
          </div>
        )}

        {isTicketOpen && lastSale && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-sm p-8 font-mono text-[11px] relative shadow-2xl overflow-y-auto max-h-[90vh]">
              <button onClick={() => setIsTicketOpen(false)} className="absolute top-4 right-4 text-slate-400 print:hidden p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
              <div className="text-center mb-6">
                <div className="flex justify-center mb-4">
                   <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-2xl italic tracking-tighter">
                     {config.logo ? <img src={config.logo} alt="Logo" className="w-full h-full object-cover rounded-2xl" /> : 'S'}
                   </div>
                </div>
                <h2 className="text-lg font-black uppercase italic tracking-tighter leading-none mb-1">{config.name}</h2>
                <p className="font-bold">NIT: {config.nit}</p>
                <p className="uppercase">{config.address}</p>
                <div className="border-b border-dashed my-4 border-slate-300"></div>
                <p className="font-black uppercase tracking-widest text-xs">TICKET DE VENTA</p>
                <p className="font-bold">FOLIO #{lastSale.id.slice(-8)}</p>
                <p>{new Date(lastSale.date).toLocaleString()}</p>
              </div>
              <div className="border-t border-dashed pt-4 mb-4 border-slate-300">
                <div className="flex justify-between font-black mb-2 text-[10px]"><span>DESCRIPCIÓN</span><span>VALOR</span></div>
                {lastSale.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between mb-1">
                    <span className="truncate w-3/4 uppercase">{it.name} x{it.quantity}</span>
                    <span>${(it.price * it.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed pt-4 mb-6 border-slate-300 space-y-1">
                <div className="flex justify-between text-slate-500"><span>SUBTOTAL</span><span>${lastSale.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between font-black text-sm pt-2 border-t border-slate-100 uppercase"><span>Total Neto</span><span>${lastSale.total.toFixed(2)}</span></div>
              </div>
              <div className="text-center italic text-slate-400 text-[10px]">
                 <p className="font-bold uppercase">{config.slogan}</p>
                 <p className="mt-2">Gracias por su compra en SPORT MASTER</p>
              </div>
              <button onClick={() => window.print()} className="mt-8 w-full bg-slate-900 text-white py-3.5 rounded-xl font-black uppercase tracking-widest print:hidden shadow-lg flex items-center justify-center gap-2"><Printer size={16} /> IMPRIMIR TICKET</button>
            </div>
          </div>
        )}

        {/* Modal de Pago de Crédito */}
        {isPaymentModalOpen && selectedCredit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Registrar Abono</h3>
                <button onClick={() => { setIsPaymentModalOpen(false); setSelectedCredit(null); }} className="text-slate-400"><X size={24} /></button>
              </div>
              <div className="p-8 space-y-6">
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <p className="text-[10px] font-black text-blue-400 uppercase mb-1">Saldo Actual</p>
                  <p className="text-2xl font-black text-blue-700 italic tracking-tighter">${selectedCredit.balance.toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Monto del Abono</label>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    className="w-full px-4 py-4 rounded-2xl border-2 font-black text-xl outline-none focus:border-blue-500 bg-slate-50" 
                    value={paymentAmount} 
                    onChange={(e) => setPaymentAmount(e.target.value)} 
                    autoFocus
                  />
                </div>
                <button 
                  onClick={handleAddPayment} 
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl"
                >
                  Confirmar Pago
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Extracto / Historial */}
        {isStatementOpen && statementCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Extracto de Cartera</h3>
                <button onClick={() => { setIsStatementOpen(false); setStatementCustomer(null); }} className="text-slate-400"><X size={24} /></button>
              </div>
              <div className="p-8 flex-1 overflow-y-auto space-y-8 custom-scrollbar">
                <div className="border-b pb-6">
                  <h4 className="font-black text-2xl uppercase italic tracking-tighter text-blue-600">{statementCustomer.name}</h4>
                  <p className="text-xs font-bold text-slate-400 uppercase">NIT: {statementCustomer.nit} | TEL: {statementCustomer.phone}</p>
                </div>
                
                <div className="space-y-6">
                  {credits.filter(c => c.customerId === statementCustomer.id).map(credit => (
                    <div key={credit.id} className="border rounded-2xl p-6 bg-slate-50/50">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Crédito #{credit.id.slice(-6)}</p>
                          <p className="text-[10px] font-bold text-slate-400">Venta: #{credit.saleId.slice(-8)}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${credit.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{credit.status}</span>
                      </div>
                      
                      <div className="space-y-3">
                         <div className="flex justify-between text-xs font-bold uppercase text-slate-400"><span>Concepto / Fecha</span><span className="text-right">Monto</span></div>
                         <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-[10px] font-black uppercase text-slate-600 italic">Cargo Inicial ({new Date(credit.id.replace('CR', '') * 1).toLocaleDateString()})</span>
                            <span className="font-black text-slate-800">${credit.totalAmount.toLocaleString()}</span>
                         </div>
                         {credit.payments.map(p => (
                           <div key={p.id} className="flex justify-between items-center py-2 border-b text-blue-600 italic">
                             <span className="text-[10px] font-black uppercase">Abono Recibido ({new Date(p.date).toLocaleDateString()})</span>
                             <span className="font-black">-${p.amount.toLocaleString()}</span>
                           </div>
                         ))}
                         <div className="flex justify-between items-center pt-4">
                            <span className="text-[10px] font-black uppercase text-slate-400">Saldo Pendiente</span>
                            <span className="text-xl font-black text-blue-600 tracking-tighter">${credit.balance.toLocaleString()}</span>
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-6 border-t bg-slate-50 flex justify-end">
                <button onClick={() => window.print()} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black uppercase text-xs flex items-center gap-2">
                  <Printer size={16} /> Imprimir Extracto
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        @media print {
          body * { visibility: hidden; }
          .fixed.inset-0.z-\[60\], .report-print-container { 
            visibility: visible !important; 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            height: auto; 
            background: white; 
          }
          .fixed.inset-0.z-\[60\] *, .report-print-container * { visibility: visible !important; }
          .sidebar, header, nav, button, .print\:hidden { display: none !important; }
          .shadow-2xl, .shadow-sm, .shadow-lg { box-shadow: none !important; border: 1px solid #eee !important; }
          main { margin-left: 0 !important; padding: 0 !important; }
          .report-print-container { padding: 0 !important; border: none !important; }
          thead { display: table-header-group !important; }
          tr { page-break-inside: avoid !important; }
        }
      `}</style>
    </div>
  );
};

export default App;
