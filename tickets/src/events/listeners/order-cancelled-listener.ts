import { Listener, OrderCancelledEvent, Subjects } from "@cygnetops/common";
import { Message } from 'node-nats-streaming';
import { queueGroupName } from "./queue-group-name";
import { Ticket } from "../../models/ticket";
import { TicketUpdatedPublisher } from "../publishers/ticket-updated-publisher";

export class OrderCancelledListener extends Listener<OrderCancelledEvent> {
    subject: Subjects.OrderCancelled = Subjects.OrderCancelled;
    queueGroupName = queueGroupName;

    async onMessage(data: OrderCancelledEvent['data'], msg: Message) {
        // find the ticket the order is reserving
        const ticket = await Ticket.findById(data.ticket.id);

        // if ticket not exist throw error
        if (!ticket) {
            throw new Error('Ticket not found');
        }
        
        // mark ticket as being reserved
        ticket.set({ orderId: data.id });
        await ticket.save();
        await new TicketUpdatedPublisher(this.client).publish({
            id: ticket.id,
            price: ticket.price,
            title: ticket.title,
            userId: ticket.userId,
            orderId: ticket.orderId,
            version: ticket.version,
        });

        // ack message
        msg.ack();
    }
}