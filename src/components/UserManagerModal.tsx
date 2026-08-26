import React, { useState } from 'react';
import { 
  Users, 
  ShieldCheck, 
  User, 
  UserPlus, 
  Trash2, 
  Edit3, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Search,
  Mail,
  Building,
  Phone,
  Shield,
  Save,
  UserCheck,
  Lock,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  KeyRound,
  CloudCheck
} from 'lucide-react';
import { useAuth, CreateUserData } from '../context/AuthContext';
import { UserProfile, UserRole } from '../types';

interface UserManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManagerModal: React.FC<UserManagerModalProps> = ({ isOpen, onClose }) => {
  const { user, allUsers, createUser, updateUser, resetUserPassword, deleteUserProfile, refreshUsers } = useAuth();
  
  const [search, setSearch] = useState('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Create / Edit modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form fields
  const [formData, setFormData] = useState<CreateUserData>({
    displayName: '',
    email: '',
    password: '',
    department: 'Gestión Territorial',
    phone: '',
    role: 'usuario',
    status: 'active',
  });

  // Delete confirmation
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  if (!isOpen) return null;

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 4500);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshUsers();
      showNotification('Lista de funcionarios sincronizada con Firebase Firestore.');
    } catch {
      showNotification('Error al sincronizar con Firestore', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const togglePasswordVisibility = (uid: string) => {
    setRevealedPasswords(prev => ({
      ...prev,
      [uid]: !prev[uid]
    }));
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
    let result = 'C';
    for (let i = 0; i < 7; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, password: result + '26!' }));
  };

  const filtered = allUsers.filter((u) => 
    u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.department?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone?.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingUser(null);
    setShowPassword(true);
    setFormData({
      displayName: '',
      email: '',
      password: 'Coelemu' + Math.floor(1000 + Math.random() * 9000) + '!',
      department: 'Gestión Territorial',
      phone: '',
      role: 'usuario',
      status: 'active',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (targetUser: UserProfile) => {
    setEditingUser(targetUser);
    setShowPassword(false);
    setFormData({
      displayName: targetUser.displayName || '',
      email: targetUser.email || '',
      password: targetUser.passwordHint || '',
      department: targetUser.department || 'Gestión Territorial',
      phone: targetUser.phone || '',
      role: targetUser.role || 'usuario',
      status: targetUser.status || 'active',
    });
    setIsFormOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    if (!formData.displayName.trim() || !formData.email.trim()) {
      showNotification('Nombre y correo electrónico son obligatorios.', 'error');
      return;
    }

    if (!editingUser && (!formData.password || formData.password.length < 6)) {
      showNotification('La contraseña debe tener al menos 6 caracteres para acceso cross-device.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (editingUser) {
        // Update existing user
        await updateUser(editingUser.uid, {
          displayName: formData.displayName.trim(),
          email: formData.email.trim().toLowerCase(),
          department: formData.department?.trim(),
          phone: formData.phone?.trim(),
          role: formData.role,
          status: formData.status,
          passwordHint: formData.password?.trim() || editingUser.passwordHint,
        });
        showNotification(`Usuario "${formData.displayName}" actualizado y sincronizado en Firestore.`);
      } else {
        // Create new user
        await createUser(formData);
        showNotification(`Nuevo usuario "${formData.displayName}" guardado con éxito en Firestore. Ya puede ingresar desde cualquier celular o PC.`);
      }
      setIsFormOpen(false);
      setEditingUser(null);
      refreshUsers().catch(() => {});
    } catch (err: any) {
      showNotification(err.message || 'Error al guardar el usuario en Firebase', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyCredentials = (u: UserProfile) => {
    const pass = u.passwordHint || 'Coelemu2026';
    const text = `Credenciales de Acceso - SIG Territorial Coelemu\nUsuario: ${u.email}\nContraseña: ${pass}\nRol: ${u.role === 'admin' ? 'Administrador' : 'Usuario (Terreno)'}`;
    navigator.clipboard.writeText(text);
    showNotification(`Credenciales de ${u.displayName} copiadas al portapapeles.`);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await deleteUserProfile(userToDelete.uid);
      showNotification(`Usuario "${userToDelete.displayName}" eliminado de Firestore.`);
      setUserToDelete(null);
    } catch (err: any) {
      showNotification(err.message || 'Error al eliminar usuario', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="user-manager-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-900"
      >
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-inner">
              <Users className="w-5 h-5 text-slate-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg tracking-tight leading-tight">
                  Gestión de Usuarios y Control de Accesos
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 text-[10px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Firebase Firestore Cloud
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-tight mt-0.5">
                Los usuarios registrados aquí pueden ingresar desde cualquier dispositivo (celular, tablet o PC)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Sincronizar usuarios con Firebase Firestore"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Roles Description Banner */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-5 py-2.5 text-xs grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-800">
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-700 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-slate-900">Rol Administrador:</strong>
              <p className="text-slate-600 text-[11px] leading-tight mt-0.5">
                Carga de capas KMZ/KML, edición global de riesgos, gestión y alta de usuarios, exportación de reportes.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 text-slate-700 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-slate-900">Rol Usuario (Operativo / Terreno):</strong>
              <p className="text-slate-600 text-[11px] leading-tight mt-0.5">
                Visualización de capas SIG, filtros interactivos de amenazas, reporte de puntos críticos en terreno.
              </p>
            </div>
          </div>
        </div>

        {/* Notification Toast */}
        {actionMessage && (
          <div className={`px-5 py-2 text-xs flex items-center gap-2 font-medium border-b ${
            actionMessage.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
        )}

        {/* Action Header: Search & Add Button */}
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar funcionario por nombre, correo, departamento o fono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-slate-800 focus:outline-none"
            />
          </div>
          
          <button
            id="btn-add-user-modal"
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-slate-300" />
            <span>Agregar Nuevo Funcionario</span>
          </button>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="font-semibold text-slate-600 text-sm">No se encontraron funcionarios</p>
              <p className="text-xs text-slate-400 mt-1">Prueba con otro término de búsqueda o agrega un nuevo usuario.</p>
            </div>
          ) : (
            filtered.map((u) => {
              const isCurrentUser = user?.uid === u.uid || user?.email?.toLowerCase() === u.email?.toLowerCase();
              const isSuperAdmin = u.email?.toLowerCase() === 'localizacioncoelemu@gmail.com';
              const isPassRevealed = revealedPasswords[u.uid] || false;

              return (
                <div
                  key={u.uid}
                  className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  {/* User Profile Info */}
                  <div className="flex items-start sm:items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center flex-shrink-0 text-sm shadow-xs ${
                      u.role === 'admin' 
                        ? 'bg-slate-800 text-white border border-slate-700' 
                        : 'bg-slate-100 text-slate-700 border border-slate-300'
                    }`}>
                      {u.displayName?.charAt(0).toUpperCase() || 'U'}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{u.displayName}</span>
                        {isCurrentUser && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-white text-[10px] font-bold">
                            (Sesión Actual)
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          u.role === 'admin' 
                            ? 'bg-slate-900 text-white border-slate-800' 
                            : 'bg-slate-100 text-slate-800 border-slate-300'
                        }`}>
                          {u.role === 'admin' ? '🛡️ Administrador' : '👤 Usuario'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          u.status === 'active' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {u.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>

                      <div className="text-slate-500 text-[11px] flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                        <span className="flex items-center gap-1 font-mono text-slate-700">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {u.email}
                        </span>
                        {u.department && (
                          <span className="flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-400" />
                            {u.department}
                          </span>
                        )}
                        {u.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {u.phone}
                          </span>
                        )}
                        {u.passwordHint && (
                          <div className="flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-mono text-[10px] border border-slate-200">
                            <KeyRound className="w-2.5 h-2.5 text-slate-500" />
                            <span>Pass: {isPassRevealed ? u.passwordHint : '••••••••'}</span>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(u.uid)}
                              className="ml-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                              title={isPassRevealed ? 'Ocultar' : 'Ver contraseña'}
                            >
                              {isPassRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions (Copy / Edit / Delete) */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => handleCopyCredentials(u)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Copiar credenciales para enviar al funcionario"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Copiar Clave</span>
                    </button>

                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Editar datos o contraseña del usuario"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    <button
                      disabled={isCurrentUser || isSuperAdmin}
                      onClick={() => setUserToDelete(u)}
                      className={`px-2.5 py-1.5 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isCurrentUser || isSuperAdmin
                          ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                          : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                      }`}
                      title={isCurrentUser ? 'No puedes eliminar tu propia cuenta' : 'Eliminar usuario'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <span>Total: {allUsers.length} funcionarios con acceso registrado en la comuna</span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sincronización Multi-Dispositivo Activa
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>

      {/* SUB-MODAL: Add / Edit User Form */}
      {isFormOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 text-slate-900">
            
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-300" />
                <h4 className="font-bold text-sm sm:text-base">
                  {editingUser ? 'Editar Funcionario & Contraseña' : 'Registrar Nuevo Funcionario'}
                </h4>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Marcelo Morales Carrasco"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Correo Electrónico <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="Ej: mmorales@coelemu.cl"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-slate-800 focus:outline-none font-mono"
                />
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Contraseña de Acceso</span>
                    {!editingUser && <span className="text-red-500">*</span>}
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] text-slate-600 hover:text-slate-900 flex items-center gap-1 underline font-medium cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Generar Clave
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!editingUser}
                    placeholder={editingUser ? 'Dejar en blanco para mantener la actual' : 'Mínimo 6 caracteres'}
                    value={formData.password || ''}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-slate-800 focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Esta clave permitirá al funcionario iniciar sesión desde cualquier dispositivo (celular, tablet o PC).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Departamento / Unidad
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Dirección de Seguridad"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Teléfono de Contacto
                  </label>
                  <input
                    type="tel"
                    placeholder="Ej: +56 9 1234 5678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Rol en el Sistema <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold bg-slate-50 focus:ring-2 focus:ring-slate-800 focus:outline-none"
                  >
                    <option value="admin">Administrador (Control total)</option>
                    <option value="usuario">Usuario (Terreno / Operativo)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Estado de la Cuenta
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold bg-slate-50 focus:ring-2 focus:ring-slate-800 focus:outline-none"
                  >
                    <option value="active">Activo (Habilitado)</option>
                    <option value="inactive">Inactivo (Suspendido)</option>
                    <option value="pending">Pendiente de Aprobación</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-xs"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>Guardando en Firestore...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{editingUser ? 'Guardar Cambios' : 'Registrar Funcionario'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {userToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-md p-5 text-xs flex flex-col space-y-4 text-slate-900">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">¿Eliminar Funcionario?</h4>
                <p className="text-slate-500 text-[11px]">Esta acción revocará el acceso al sistema.</p>
              </div>
            </div>

            <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
              ¿Estás seguro de que deseas eliminar a <strong>{userToDelete.displayName}</strong> ({userToDelete.email})? Esta operación no se puede deshacer.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold cursor-pointer transition-colors"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};


