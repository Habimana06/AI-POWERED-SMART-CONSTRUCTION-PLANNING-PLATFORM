import { classNames, getInitials } from '../utils/helpers';

export default function UserAvatar({ user, className = '', size = 'md', imageClassName = '' }) {
  const sizes = {
    sm: 'h-9 w-9 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-24 w-24 text-3xl',
  };
  const sz = sizes[size] || sizes.md;
  const url = user?.avatarUrl;

  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={classNames('rounded-xl object-cover border border-steel-100 shrink-0', sz, imageClassName, className)}
      />
    );
  }

  return (
    <div className={classNames('flex items-center justify-center rounded-xl bg-primary font-bold text-white shrink-0', sz, className)}>
      {getInitials(user?.firstName, user?.lastName)}
    </div>
  );
}
