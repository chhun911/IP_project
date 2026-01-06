import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderDto, UpdateOrderDto } from './dto/order.dto';

export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

@Injectable()
export class OrderService {
  // In-memory storage (replace with database in production)
  private orders: Map<string, Order> = new Map();
  private orderCounter: number = 1;

  async getAllOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }

  async getOrderById(id: string): Promise<Order> {
    const order = this.orders.get(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async createOrder(dto: CreateOrderDto): Promise<Order> {
    const order: Order = {
      id: `ORD-${this.orderCounter++}`,
      customerId: dto.customerId,
      items: dto.items,
      status: 'pending',
      totalAmount: dto.totalAmount,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.orders.set(order.id, order);
    return order;
  }

  async updateOrder(id: string, dto: UpdateOrderDto): Promise<Order> {
    const order = this.orders.get(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const updatedOrder: Order = {
      id: order.id,
      customerId: order.customerId,
      items: dto.items || order.items,
      status: (dto.status as Order['status']) || order.status,
      totalAmount: dto.totalAmount || order.totalAmount,
      createdAt: order.createdAt,
      updatedAt: new Date(),
    };

    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  async deleteOrder(id: string): Promise<void> {
    const exists = this.orders.has(id);
    if (!exists) {
      throw new NotFoundException('Order not found');
    }
    this.orders.delete(id);
  }
}
