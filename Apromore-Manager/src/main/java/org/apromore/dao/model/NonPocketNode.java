package org.apromore.dao.model;

import org.springframework.beans.factory.annotation.Configurable;

import java.io.Serializable;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;

import static javax.persistence.GenerationType.IDENTITY;

/**
 * NonPocketNode generated by hbm2java
 */
@Entity
@Table(name = "non_pocket_node")
@Configurable("nonPocketNode")
public class NonPocketNode implements Serializable {

    private Integer id;
    private Node node;

    /**
     * Public Constructor.
     */
    public NonPocketNode() { }



    /**
     * returns the Id of this Object.
     * @return the id
     */
    @Id
    @GeneratedValue(strategy = IDENTITY)
    @Column(name = "id", unique = true, nullable = false)
    public Integer getId() {
        return this.id;
    }

    /**
     * Sets the Id of this Object
     * @param id the new Id.
     */
    public void setId(final Integer id) {
        this.id = id;
    }



    @ManyToOne
    @JoinColumn(name = "nodeId")
    public Node getNode() {
        return this.node;
    }

    public void setNode(final Node newNode) {
        this.node = newNode;
    }

}


