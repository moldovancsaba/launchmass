export default function OrganizationsRedirect(){
  return null;
}

export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/settings#organizations',
      permanent: false
    }
  };
}
