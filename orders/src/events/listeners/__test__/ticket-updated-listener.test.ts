import { Message } from 'node-nats-streaming';
import mongoose from 'mongoose';
import { TicketUpdatedEvent } from '@cygnetops/common';
import { TicketUpdatedListener } from '../ticket-updated-listener';
import { natsWrapper } from '../../../nats-wrapper';
import { Ticket } from '../../../models/ticket';
import { createCatchClause } from 'typescript';

const setup = async () => {
    // create a listener
    const listener = new TicketUpdatedListener(natsWrapper.client);
    
    // create and save a ticket
    const ticket = Ticket.build({
        id: mongoose.Types.ObjectId().toHexString(),
        title: 'concert',
        price: 20
    });
    await ticket.save();

    // create fake data object
    const data: TicketUpdatedEvent['data'] = {
        id: ticket.id,
        version: ticket.version + 1,
        title: 'new concert',
        price: 999,
        userId: 'asdsf'
    };
    
    // create fake msg object
    // @ts-ignore
    const msg: Message = {
        ack: jest.fn()
    };
    
    return { msg, data, ticket, listener };
};

it('finds updates and saves a ticket', async () => {
    const { msg, data, ticket, listener } = await setup();

    // call the onMessage function with the data obj + message obj
    await listener.onMessage(data, msg);

    // write assertions to make sure a ticket was created
    const updatedTicket = await Ticket.findById(ticket.id);

    expect(updatedTicket!.title).toEqual(data.title);
    expect(updatedTicket!.price).toEqual(data.price);
    expect(updatedTicket!.version).toEqual(data.version);
});

it('acks the message', async () => {
    const { msg, data, ticket, listener } = await setup();

    // call the onMessage function with the data obj + message obj
    await listener.onMessage(data, msg);

    // write assertions to make sure a ack function is called
    expect(msg.ack).toHaveBeenCalled();
});

it('doesnt call ack if event skipped a version', async () => {
    const { msg, data, ticket, listener } = await setup();

    data.version = 10;

    try{
        await listener.onMessage(data, msg);
    } catch(err) {

    }

    expect(msg.ack).not.toHaveBeenCalled();
});
