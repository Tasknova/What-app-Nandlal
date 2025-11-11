// Test script to debug delete template API
const testDeleteTemplate = async () => {
  const testData = {
    userId: 'nandlalwa',
    password: 'your_password_here', // Replace with actual password
    wabaNumber: '919370853371',
    templateName: 'test_template_name', // Replace with actual template name
    language: 'en'
  };

  console.log('Testing delete template API with data:', {
    ...testData,
    password: '***' + testData.password.slice(-4)
  });

  try {
    // Test the proxy endpoint (port 8080)
    const response = await fetch('http://localhost:8080/api/delete-template', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Response text:', responseText);

    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('Parsed response:', data);
      } catch (e) {
        console.log('Response is not JSON');
      }
    } else {
      console.log('Request failed with status:', response.status);
      try {
        const errorData = JSON.parse(responseText);
        console.log('Error details:', errorData);
      } catch (e) {
        console.log('Error response is not JSON');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

// Run the test
testDeleteTemplate();
