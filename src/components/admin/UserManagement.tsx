import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole, UserRecord } from '../../context/AuthContext';
import {
  Users, ShieldCheck, GraduationCap, RefreshCw, ChevronDown,
  Plus, Pencil, UserX, UserCheck
} from 'lucide-react';
import { UserFormModal } from './UserFormModal';

export const UserManagement = () => {
  const { getAllUsers, updateUserRole, disableUser, user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ uid: string; msg: string } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<'create' | 'edit' | null>(null);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAllUsers()
      .then(data => { if (!cancelled) setUsers(data); })
      .catch(err => {
        console.error('Error al cargar usuarios:', err);
        if (!cancelled) setFetchError('No se pudieron cargar los usuarios. Intenta recargar.');
      })
      .finally(() => { if (!cancelled) setLoadingUsers(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    let cancelled = false;
    setLoadingUsers(true);
    setFetchError(null);
    getAllUsers()
      .then(data => { if (!cancelled) setUsers(data); })
      .catch(err => {
        console.error('Error al cargar usuarios:', err);
        if (!cancelled) setFetchError('No se pudieron cargar los usuarios. Intenta recargar.');
      })
      .finally(() => { if (!cancelled) setLoadingUsers(false); });
    return () => { cancelled = true; };
  };

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    const targetUser = users.find(u => u.uid === uid);
    const userName = targetUser?.displayName || targetUser?.email || 'este usuario';
    if (!window.confirm(`¿Estás seguro de cambiar el rol de ${userName} a "${newRole}"?`)) {
      return;
    }

    setUpdating(uid);
    setFeedback(null);
    try {
      await updateUserRole(uid, newRole);
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
      setFeedback({ uid, msg: `Rol actualizado a ${newRole}` });
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      setFeedback({ uid, msg: 'Error al actualizar el rol.' });
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setUpdating(null);
    }
  };

  const handleDisableToggle = async (uid: string, currentDisabled: boolean | undefined) => {
    const targetUser = users.find(u => u.uid === uid);
    const userName = targetUser?.displayName || targetUser?.email || 'este usuario';
    const action = currentDisabled ? 'restaurar' : 'deshabilitar';
    if (!window.confirm(`¿Estás seguro de ${action} a "${userName}"?`)) {
      return;
    }

    setUpdating(uid);
    setFeedback(null);
    try {
      await disableUser(uid, !currentDisabled);
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, disabled: !currentDisabled } : u));
      const msg = currentDisabled ? 'Usuario restaurado exitosamente.' : 'Usuario deshabilitado.';
      setFeedback({ uid, msg });
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      setFeedback({ uid, msg: 'Error al actualizar el estado del usuario.' });
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setUpdating(null);
    }
  };

  const openEditModal = (u: UserRecord) => {
    setEditUser(u);
    setShowModal('edit');
  };

  const handleSuccess = () => {
    setShowModal(null);
    setEditUser(null);
    handleRefresh();
  };

  const isAdmin = currentUser?.role === 'Administrador';

  return (
    <div>
      <div className="user-mgmt-panel">
        <div className="user-mgmt-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={20} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontWeight: 600, fontSize: '15px' }}>Usuarios del Sistema</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {isAdmin && (
              <button
                className="btn-icon-round btn-add-user"
                onClick={() => setShowModal('create')}
                title="Agregar usuario"
                aria-label="Agregar nuevo usuario"
              >
                <Plus size={16} />
              </button>
            )}
            <button
              className="btn-icon-round"
              onClick={handleRefresh}
              disabled={loadingUsers}
              title="Recargar lista"
              aria-label="Recargar lista de usuarios"
            >
              <RefreshCw size={15} className={loadingUsers ? 'spin-icon' : ''} />
            </button>
          </div>
        </div>

        {loadingUsers ? (
          <div className="user-mgmt-loading">
            <div className="spinner" style={{ width: '22px', height: '22px' }}></div>
            <span>Cargando usuarios...</span>
          </div>
        ) : fetchError ? (
          <p style={{ textAlign: 'center', color: '#f87171', fontSize: '14px', padding: '20px 0' }}>
            {fetchError}
          </p>
        ) : users.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '14px', padding: '20px 0' }}>
            No hay usuarios registrados.
          </p>
        ) : (
          <div className="user-list">
            {users.map(u => {
              const isSelf = u.uid === currentUser?.uid;
              const isDisabled = u.disabled === true;
              const initials = u.displayName
                ? u.displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
                : u.email?.substring(0, 2).toUpperCase() ?? '?';

              return (
                <div key={u.uid} className={`user-row ${isSelf ? 'user-row-self' : ''} ${isDisabled ? 'user-row-disabled' : ''}`}>
                  <div className={`user-avatar-mini ${u.role === 'Administrador' ? 'avatar-admin' : 'avatar-profesor'}`}
                    style={isDisabled ? { opacity: 0.4 } : undefined}>
                    {initials}
                  </div>

                  <div className="user-info">
                    <span className="user-name">
                      {u.displayName || 'Sin nombre'}
                      {isSelf && <span className="self-tag">Tú</span>}
                      {isDisabled && <span className="badge-disabled">Deshabilitado</span>}
                    </span>
                    <span className="user-email">{u.email}</span>
                  </div>

                  <div className="role-select-wrapper">
                    {feedback?.uid === u.uid ? (
                      <span className={`role-feedback ${feedback.msg.includes('Error') ? 'role-feedback-error' : 'role-feedback-ok'}`}>
                        {feedback.msg}
                      </span>
                    ) : (
                      <div className="role-select-container">
                        <select
                          className="role-select"
                          value={u.role}
                          disabled={updating === u.uid || isSelf || !isAdmin}
                          onChange={e => handleRoleChange(u.uid, e.target.value as UserRole)}
                          aria-label={`Rol de ${u.displayName || u.email}`}
                        >
                          <option value="Administrador">Administrador</option>
                          <option value="Profesor">Profesor</option>
                        </select>
                        <ChevronDown size={13} className="role-select-arrow" />
                        {updating === u.uid && (
                          <div className="spinner spinner-sm"></div>
                        )}
                      </div>
                    )}

                    <div className="role-badge-mini">
                      {u.role === 'Administrador'
                        ? <ShieldCheck size={12} style={{ color: '#f59e0b' }} />
                        : <GraduationCap size={12} style={{ color: '#a78bfa' }} />
                      }
                    </div>

                    {isAdmin && !isSelf && (
                      <div className="user-actions">
                        <button
                          className="btn-icon-round btn-action-edit"
                          onClick={() => openEditModal(u)}
                          title="Editar usuario"
                          aria-label={`Editar ${u.displayName || u.email}`}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className={`btn-icon-round ${isDisabled ? 'btn-action-restore' : 'btn-action-disable'}`}
                          onClick={() => handleDisableToggle(u.uid, isDisabled)}
                          title={isDisabled ? 'Restaurar usuario' : 'Deshabilitar usuario'}
                          aria-label={isDisabled ? `Restaurar ${u.displayName || u.email}` : `Deshabilitar ${u.displayName || u.email}`}
                        >
                          {isDisabled ? <UserCheck size={13} /> : <UserX size={13} />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal === 'create' && (
        <UserFormModal
          mode="create"
          onClose={() => setShowModal(null)}
          onSuccess={handleSuccess}
        />
      )}

      {showModal === 'edit' && editUser && (
        <UserFormModal
          mode="edit"
          initialData={{
            uid: editUser.uid,
            email: editUser.email ?? '',
            password: '',
            displayName: editUser.displayName ?? '',
            role: editUser.role,
          }}
          onClose={() => { setShowModal(null); setEditUser(null); }}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};
