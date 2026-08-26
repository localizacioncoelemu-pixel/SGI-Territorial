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
  UserCheck
} from 'lucide-react';
import { useAuth, CreateUserData } from '../context/AuthContext';
import { UserProfile, UserRole } from '../types';

interface UserManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManagerModal: React.FC<UserManagerModalProps> = ({ isOpen, onClose }) => {
  const { user, allUsers, createUser, updateUser, deleteUserProfile } = useAuth();
  
  const [search, setSearch] = useState('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Create / Edit modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  
  // Form fields
  const [formData, setFormData] = useState<CreateUserData>({
    displayName: '',
    email: '',
    department: 'Análisis SIG & Terreno',
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

  const filtered = allUsers.filter((u) => 
    u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.department?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone?.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      displayName: '',
      email: '',
      department: 'Gestión Territorial',
      phone: '',
      role: 'usuario',
      status: 'active',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (targetUser: UserProfile) => {
    setEditingUser(targetUser);
    setFormData({
      displayName: targetUser.displayName || '',
      email: targetUser.email || '',
      department: targetUser.department || 'Gestión Territorial',
      phone: targetUser.phone || '',
      role: targetUser.role || 'usuario',
      status: targetUser.status || 'active',
    });
    setIsFormOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.displayName.trim() || !formData.email.trim()) {
      showNotification('Nombre y correo electrónico son obligatorios', 'error');
      return;
    }

    try {
      if (editingUser) {
        // Update existing user
        await updateUser(editingUser.uid, {
          displayName: formData.displayName.trim(),
          email: formData.email.trim(),
          department: formData.department?.trim(),
          phone: formData.phone?.trim(),
          role: formData.role,
          status: formData.status,
        });
        showNotification(`Usuario "${formData.displayName}" actualizado exitosamente.`);
      } else {
        // Create new user
        await createUser(formData);
        showNotification(`Nuevo usuario "${formData.displayName}" agregado correctamente.`);
      }
      setIsFormOpen(false);
      setEditingUser(null);
    } catch (err: any) {
      showNotification(err.message || 'Error al guardar el usuario', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await deleteUserProfile(userToDelete.uid);
      showNotification(`Usuario "${userToDelete.displayName}" eliminado correctamente.`);
      setUserToDelete(null);
    } catch (err: any) {
      showNotification(err.message || 'Error al eliminar usuario', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="user-manager-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        
        {/* Modal Header */}
        <div className="bg-emerald-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700/80 border border-emerald-500/40 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg tracking-tight leading-tight">
                Gestión de Usuarios y Control de Accesos
              </h3>
              <p className="text-xs text-emerald-200/90 leading-tight">
                Administración de funcionarios, roles (Administrador / Usuario) y permisos en tiempo real
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-emerald-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Roles Description Banner */}
        <div className="bg-emerald-50/80 border-b border-emerald-200/90 px-5 py-2.5 text-xs grid grid-cols-1 sm:grid-cols-2 gap-3 text-emerald-950">
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-emerald-900">Rol Administrador:</strong>
              <p className="text-slate-600 text-[11px] leading-tight mt-0.5">
                Carga de capas KMZ/KML, edición global de riesgos, gestión y alta de usuarios, exportación de reportes.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-emerald-900">Rol Usuario (Operativo / Terreno):</strong>
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
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar funcionario por nombre, correo, departamento o fono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          
          <button
            id="btn-add-user-modal"
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Agregar Nuevo Usuario</span>
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
              const isCurrentUser = user?.uid === u.uid;
              const isSuperAdmin = u.email?.toLowerCase() === 'localizacioncoelemu@gmail.com';

              return (
                <div
                  key={u.uid}
                  className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  {/* User Profile Info */}
                  <div className="flex items-start sm:items-center gap-3">
                    <div className={`w-10 h-10 rounded-full font-bold flex items-center justify-center flex-shrink-0 text-sm shadow-xs ${
                      u.role === 'admin' 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                      {u.displayName?.charAt(0).toUpperCase() || 'U'}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{u.displayName}</span>
                        {isCurrentUser && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            (Sesión Actual)
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          u.role === 'admin' 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}>
                          {u.role === 'admin' ? '🛡️ Administrador' : '👤 Usuario'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          u.status === 'active' 
                            ? 'bg-emerald-100/70 text-emerald-700' 
                            : 'bg-red-100/70 text-red-700'
                        }`}>
                          {u.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>

                      <div className="text-slate-500 text-[11px] flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                        <span className="flex items-center gap-1">
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
                      </div>
                    </div>
                  </div>

                  {/* Actions (Edit / Delete) */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Editar datos del usuario"
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
          <span className="text-slate-500 font-medium">
            Total: {allUsers.length} funcionarios con acceso registrado en la comuna
          </span>
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
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            
            <div className="bg-emerald-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-300" />
                <h4 className="font-bold text-sm sm:text-base">
                  {editingUser ? 'Editar Funcionario / Usuario' : 'Registrar Nuevo Funcionario'}
                </h4>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-emerald-100"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingUser ? 'Guardar Cambios' : 'Registrar Funcionario'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {userToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5 text-xs flex flex-col space-y-4">
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

