/* Copyright (c) 2013 NuoDB, Inc. */

package com.nuodb.storefront.model;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;

import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.OneToMany;
import javax.persistence.OrderBy;
import javax.validation.constraints.NotNull;

@Entity
public class Customer extends Model {
    @OneToMany(cascade = { CascadeType.ALL }, orphanRemoval = true, mappedBy="customer")
    @OrderBy("dateAdded")
    private List<CartSelection> cartSelections = new ArrayList<CartSelection>();

    @OneToMany(cascade = { CascadeType.ALL }, orphanRemoval = true, mappedBy="customer")
    @OrderBy("datePurchased")
    private List<Purchase> transactions = new ArrayList<Purchase>();

    private String emailAddress;

    @NotNull
    private Calendar dateAdded;

    @NotNull
    private Calendar dateLastActive;

    private transient int cartItemCount;

    public Customer() {
    }

    public List<CartSelection> getCartSelections() {
        return cartSelections;
    }

    public List<Purchase> getTransactions() {
        return transactions;
    }

    public String getEmailAddress() {
        return emailAddress;
    }

    public void setEmailAddress(String emailAddress) {
        this.emailAddress = emailAddress;
    }

    public Calendar getDateAdded() {
        return dateAdded;
    }

    public void setDateAdded(Calendar dateAdded) {
        this.dateAdded = dateAdded;
    }

    public Calendar getDateLastActive() {
        return dateLastActive;
    }

    public void setDateLastActive(Calendar dateLastActive) {
        this.dateLastActive = dateLastActive;
    }

    public void addCartSelection(CartSelection selection) {
        selection.setCustomer(this);
        cartSelections.add(selection);
    }

    public void addTransaction(Purchase transaction) {
        transaction.setCustomer(this);
        transactions.add(transaction);
    }    

    public void clearTransactions() {
        transactions = null;
    }

    public void clearCartSelections() {
        cartSelections = null;
    }

    public int getCartItemCount() {
        return cartItemCount;
    }

    public void setCartItemCount(int cartItemCount) {
        this.cartItemCount = cartItemCount;
    }

    public String getDisplayName() {
        if (emailAddress != null && !emailAddress.isEmpty()) {
            return emailAddress;
        }
        return "Customer " + getId();
    }
}
