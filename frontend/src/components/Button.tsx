import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

type Variant = 'primary' | 'secondary';

type SharedProps = {
  /** Icon shown before the label. Every button gets one — actions should be recognizable at a glance, not just readable. */
  icon: LucideIcon;
  /** Visible label. Keep it a short verb phrase ("Abrir estoque"), never the icon alone. */
  children: ReactNode;
  /** Plain-language explanation shown as a hover tooltip. Required so every action documents itself. */
  description: string;
  variant?: Variant;
};

type AsButton = SharedProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & { href?: undefined };
type AsLink = SharedProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> & { href: string };

export type ButtonProps = AsButton | AsLink;

export function Button(props: ButtonProps) {
  const { icon: Icon, children, description, variant = 'primary', className, ...rest } = props;
  const classes = ['btn', variant === 'secondary' ? 'secondary' : '', className].filter(Boolean).join(' ');
  const content = (
    <>
      <Icon size={16} strokeWidth={2.25} aria-hidden="true" />
      <span>{children}</span>
    </>
  );

  if (rest.href !== undefined) {
    const { href, ...anchorRest } = rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <a className={classes} href={href} title={description} {...anchorRest}>
        {content}
      </a>
    );
  }

  return (
    <button className={classes} type="button" title={description} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {content}
    </button>
  );
}
