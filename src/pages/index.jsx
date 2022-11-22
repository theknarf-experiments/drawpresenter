export async function getServerSideProps(context) {
  return {
    props: {
			projectFile: process.env.projectFile,
		},
  }
}

const HomePage = ({ projectFile }) => {
  return <div>Opening file { projectFile }</div>;
}

export default HomePage;
