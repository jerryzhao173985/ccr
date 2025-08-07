import { getServiceInfo } from './processCheck';

export async function showStatus() {
    const info = await getServiceInfo();
    
    console.log('\n📊 CR (Claude Router) Status');
    console.log('═'.repeat(40));
    
    if (info.running) {
        console.log('✅ Status: Running');
        console.log(`🆔 Process ID: ${info.pid}`);
        console.log(`🌐 Port: ${info.port}`);
        console.log(`📡 API Endpoint: ${info.endpoint}`);
        console.log(`📄 PID File: ${info.pidFile}`);
        console.log('');
        console.log('🚀 Ready to use! Run the following commands:');
        console.log('   cr code    # Start coding with Claude');
        console.log('   cr stop   # Stop the service');
    } else {
        console.log('❌ Status: Not Running');
        console.log('');
        console.log('💡 To start the service:');
        console.log('   cr start');
    }
    
    console.log('');
}
