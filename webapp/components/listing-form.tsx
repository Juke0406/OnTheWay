"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { DialogFooter } from "./ui/dialog";

const listingFormSchema = z.object({
  itemDescription: z
    .string()
    .min(5, {
      message: "Description must be at least 5 characters.",
    })
    .max(200, {
      message: "Description must not be longer than 200 characters.",
    }),
  itemPrice: z
    .string()
    .refine((val) => !isNaN(Number(val)), {
      message: "Price must be a valid number.",
    })
    .refine((val) => Number(val) >= 0, {
      message: "Price must be a positive number.",
    }),
  maxFee: z
    .string()
    .refine((val) => !isNaN(Number(val)), {
      message: "Fee must be a valid number.",
    })
    .refine((val) => Number(val) >= 0, {
      message: "Fee must be a positive number.",
    }),
  pickupAddress: z.string().min(5, {
    message: "Pickup address must be at least 5 characters.",
  }),
  deliveryAddress: z.string().min(5, {
    message: "Delivery address must be at least 5 characters.",
  }),
});

type ListingFormValues = z.infer<typeof listingFormSchema>;

export function ListingForm({ onClose }: { onClose: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default values for the form
  const defaultValues: Partial<ListingFormValues> = {
    itemDescription: "",
    itemPrice: "",
    maxFee: "",
    pickupAddress: "",
    deliveryAddress: "",
  };

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues,
  });

  async function onSubmit(data: ListingFormValues) {
    setIsSubmitting(true);
    
    try {
      // Convert string values to numbers for price and fee
      const formattedData = {
        ...data,
        itemPrice: parseFloat(data.itemPrice),
        maxFee: parseFloat(data.maxFee),
      };
      
      // TODO: Implement API call to create listing
      console.log("Form data:", formattedData);
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Close the dialog
      onClose();
    } catch (error) {
      console.error("Error creating listing:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="itemDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the item you need delivered"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Provide a clear description of what needs to be delivered.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="itemPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Item Price ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  The cost of the item itself.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="maxFee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Delivery Fee ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Maximum amount you're willing to pay for delivery.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="pickupAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pickup Address</FormLabel>
              <FormControl>
                <Input placeholder="Where the item should be picked up" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="deliveryAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Delivery Address</FormLabel>
              <FormControl>
                <Input placeholder="Where the item should be delivered" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Listing"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
