    //ejemplo de lo que hay que hacer con la api
    async function getData() {
      const url = "";
      try {
        const response = await fetch(url);
        if (!responsive.ok) {
          throw new Error(`Response status: ${response.status}`);
        }
        
      } catch (error) {
        console.error(error.message);
        
      }
    }