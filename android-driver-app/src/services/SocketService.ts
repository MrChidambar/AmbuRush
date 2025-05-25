import io from 'socket.io-client';

class SocketService {
  private socket: any = null;

  connect(token: string) {
    this.socket = io('https://cccdbba5-40e0-4b5f-9a77-b22f6d5ab696-00-2ppoxuasdeyrx.kirk.replit.dev', {
      auth: {
        token: token
      }
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    this.socket.on('booking_assigned', (booking: any) => {
      console.log('New booking assigned:', booking);
      // Handle new booking notification
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default new SocketService();