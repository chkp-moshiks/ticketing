import { Message } from 'node-nats-streaming';
import mongoose from 'mongoose';
import { OrderCancelledEvent } from "@cygnetops/common";
import { OrderCancelledListener } from '../order-cancelled-listener';
import { natsWrapper } from "../../../nats-wrapper";
import { Ticket } from "../../../models/ticket";

const setup = async () => {
    // create instance of listener
    const listener = new OrderCancelledListener(natsWrapper.client);

    // create and save a ticket
    const orderId = mongoose.Types.ObjectId().toHexString();
    const ticket = Ticket.build({
        title: 'concert',
        price: 20,
        userId: 'asdasd'
    });
    ticket.set({ orderId });
    await ticket.save();

    // create fake data event
    const data: OrderCancelledEvent['data'] = {
        id: orderId,
        version: 0,
        ticket: {
            id: ticket.id
        }
    };
    
    // @ts-ignore 
    const msg: Message = {
        ack: jest.fn()
    };

    return { msg, data, ticket, orderId, listener };
};

it('updates the ticket, publishes event, and acks the message', async () => {
    const { msg, data, ticket, orderId, listener } = await setup();
    await listener.onMessage(data, msg);
    const updatedTicket = await Ticket.findById(ticket.id);
    
    expect(updatedTicket!.orderId).toBeDefined();
    expect(msg.ack).toHaveBeenCalled();
    expect(natsWrapper.client.publish).toHaveBeenCalled();
});