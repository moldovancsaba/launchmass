import Link from 'next/link';
export default function OversizedLink({ href, title, description }) {
  return (
    <Link href={href} className="card">
      <h3>{title}</h3>
      <p>{description}</p>
    </Link>
  );
}
