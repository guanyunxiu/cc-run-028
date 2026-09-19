import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import styles from './Layout.module.css';

export default function Layout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  const getRoleText = (role: string) => {
    return role === 'admin' ? '管理员' : '学生';
  };

  return (
    <>
      <nav className={styles.nav}>
        <Link to="/" className={styles.brand}>
          在线课堂
        </Link>
        <div className={styles.links}>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `${styles.link} ${isActive ? styles.linkActive : ''}`
            }
          >
            课程列表
          </NavLink>
          <NavLink
            to="/learning"
            className={({ isActive }) =>
              `${styles.link} ${isActive ? styles.linkActive : ''}`
            }
          >
            学习记录
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `${styles.link} ${isActive ? styles.linkActive : ''}`
              }
            >
              课程管理
            </NavLink>
          )}
        </div>
        {user && (
          <div className={styles.rightSection}>
            <div className={styles.userInfo}>
              <div className={styles.avatar}>{getInitial(user.username)}</div>
              <span>{user.username}</span>
              <span
                className={`${styles.roleBadge} ${
                  user.role === 'admin' ? styles.roleAdmin : styles.roleStudent
                }`}
              >
                {getRoleText(user.role)}
              </span>
            </div>
            <button className={styles.logoutButton} onClick={handleLogout}>
              退出登录
            </button>
          </div>
        )}
      </nav>
      <main className={styles.content}>
        <Outlet />
      </main>
    </>
  );
}
