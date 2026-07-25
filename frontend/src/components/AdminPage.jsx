/** Consistent page shell for admin routes (same max width as PM via DashboardLayout). */

export default function AdminPage({ children, className = '' }) {

  return (

    <div className={`space-y-6 lg:space-y-8 w-full min-w-0 ${className}`.trim()}>

      {children}

    </div>

  );

}

